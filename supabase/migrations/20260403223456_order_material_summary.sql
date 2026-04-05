-- Existing orders.material_usage JSONB column stays, but we clarify its shape
-- via the application type — no SQL change needed for the column itself.

-- Add a helper view for material consumption per order
CREATE OR REPLACE VIEW order_material_summary AS
SELECT
  m.order_id,
  m.shop_id,
  SUM(m.quantity * m.unit_cost) AS total_material_cost,
  COUNT(*)                       AS material_line_count
FROM material_stock_movements m
WHERE m.movement_type = 'order_consume'
  AND m.order_id IS NOT NULL
GROUP BY m.order_id, m.shop_id;