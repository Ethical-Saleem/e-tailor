-- supabase/migrations/002_views_and_helpers.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Reporting views and helper functions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Monthly revenue view ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
  shop_id,
  DATE_TRUNC('month', created_at) AS month,
  SUM(amount)                      AS total_collected,
  COUNT(*)                         AS payment_count
FROM payments
GROUP BY shop_id, DATE_TRUNC('month', created_at);

-- ── Order stats per shop ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW order_stats AS
SELECT
  shop_id,
  status,
  priority,
  payment_status,
  COUNT(*)                           AS order_count,
  SUM(total)                         AS total_value,
  SUM(amount_paid)                   AS total_collected,
  SUM(total - amount_paid)           AS total_outstanding,
  AVG(total)                         AS avg_order_value,
  AVG(
    EXTRACT(EPOCH FROM (delivery_date::timestamp - created_at)) / 86400
  ) FILTER (WHERE delivery_date IS NOT NULL) AS avg_completion_days
FROM orders
WHERE is_deleted = FALSE
GROUP BY shop_id, status, priority, payment_status;

-- ── Low stock view ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW low_stock_materials AS
SELECT
  m.*,
  (m.minimum_stock - m.current_stock) AS deficit
FROM materials m
WHERE
  m.is_deleted = FALSE
  AND m.minimum_stock > 0
  AND m.current_stock <= m.minimum_stock
ORDER BY deficit DESC;

-- ── Customer lifetime value ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.shop_id,
  c.name,
  c.phone,
  COUNT(o.id)                AS total_orders,
  COALESCE(SUM(o.total), 0) AS total_value,
  COALESCE(SUM(o.amount_paid), 0) AS total_paid,
  MAX(o.created_at::date)    AS last_order_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.is_deleted = FALSE AND o.status != 'cancelled'
WHERE c.is_deleted = FALSE
GROUP BY c.id, c.shop_id, c.name, c.phone;

-- ── Function: get shop revenue for a date range ───────────────────────────────
CREATE OR REPLACE FUNCTION get_revenue(
  p_shop_id UUID,
  p_from    DATE,
  p_to      DATE
)
RETURNS TABLE (
  period     TEXT,
  revenue    NUMERIC,
  order_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', p.created_at), 'Mon YYYY') AS period,
    SUM(p.amount)  AS revenue,
    COUNT(DISTINCT p.order_id) AS order_count
  FROM payments p
  WHERE
    p.shop_id = p_shop_id
    AND p.created_at::date BETWEEN p_from AND p_to
  GROUP BY DATE_TRUNC('month', p.created_at)
  ORDER BY DATE_TRUNC('month', p.created_at);
END;
$$;

-- ── Function: recalculate customer totals (called after order changes) ─────────
CREATE OR REPLACE FUNCTION recalculate_customer_totals(p_customer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_orders        INTEGER;
  v_total_spend         NUMERIC;
  v_outstanding_balance NUMERIC;
  v_last_order_date     DATE;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(SUM(GREATEST(total - amount_paid, 0)), 0),
    MAX(created_at::date)
  INTO v_total_orders, v_total_spend, v_outstanding_balance, v_last_order_date
  FROM orders
  WHERE
    customer_id = p_customer_id
    AND is_deleted = FALSE
    AND status != 'cancelled';

  UPDATE customers
  SET
    total_orders        = v_total_orders,
    total_spend         = v_total_spend,
    outstanding_balance = v_outstanding_balance,
    last_order_date     = v_last_order_date,
    updated_at          = NOW()
  WHERE id = p_customer_id;
END;
$$;

-- ── Trigger: auto-recalculate customer totals on order change ─────────────────
CREATE OR REPLACE FUNCTION trigger_recalculate_customer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recalculate_customer_totals(
    COALESCE(NEW.customer_id, OLD.customer_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER orders_recalculate_customer
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_customer();

-- ── Trigger: update material average cost on new purchase ────────────────────
CREATE OR REPLACE FUNCTION trigger_update_material_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_avg_cost NUMERIC;
  v_total_qty NUMERIC;
BEGIN
  SELECT
    SUM(quantity_purchased),
    CASE WHEN SUM(quantity_purchased) > 0
         THEN SUM(total_cost) / SUM(quantity_purchased)
         ELSE 0
    END
  INTO v_total_qty, v_avg_cost
  FROM material_price_history
  WHERE material_id = NEW.material_id;

  UPDATE materials
  SET
    current_unit_cost = NEW.unit_cost,
    average_unit_cost = v_avg_cost,
    updated_at        = NOW()
  WHERE id = NEW.material_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER material_price_history_update_cost
  AFTER INSERT ON material_price_history
  FOR EACH ROW EXECUTE FUNCTION trigger_update_material_cost();

-- ── RLS for views ────────────────────────────────────────────────────────────
-- Views inherit RLS from their base tables. But for the helper views
-- we add security barriers explicitly.
ALTER VIEW monthly_revenue         SET (security_barrier = true);
ALTER VIEW order_stats             SET (security_barrier = true);
ALTER VIEW low_stock_materials     SET (security_barrier = true);
ALTER VIEW customer_lifetime_value SET (security_barrier = true);
