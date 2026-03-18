-- supabase/migrations/001_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- eTailor — Initial Database Schema
-- Applies Row Level Security (RLS) to every table.
-- All tables include: shop_id, created_at, updated_at, is_deleted
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search

-- ── Helper: auto-update updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Shops ─────────────────────────────────────────────────────────────────────
CREATE TABLE shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL CHECK (length(name) > 0),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone        TEXT,
  address      TEXT,
  currency     TEXT NOT NULL DEFAULT 'NGN',
  logo_url     TEXT,
  settings     JSONB NOT NULL DEFAULT '{
    "orderNumberPrefix": "ORD",
    "orderNumberFormat": "YYYY-NNN",
    "defaultDepositPercent": 50,
    "measurementUnit": "inches",
    "workingDays": [1,2,3,4,5,6],
    "whatsappEnabled": false,
    "taxRate": 0
  }'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Customers ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL CHECK (length(name) > 0),
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  notes               TEXT,
  avatar_url          TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  total_orders        INTEGER NOT NULL DEFAULT 0,
  total_spend         NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_order_date     DATE,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customers_shop_id_idx        ON customers(shop_id);
CREATE INDEX customers_shop_deleted_idx   ON customers(shop_id, is_deleted);
CREATE INDEX customers_name_trgm_idx      ON customers USING GIN (name gin_trgm_ops);
CREATE INDEX customers_phone_idx          ON customers(phone);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Measurement Profiles ──────────────────────────────────────────────────────
CREATE TABLE measurement_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  category     TEXT NOT NULL,
  measurements JSONB NOT NULL DEFAULT '{}',
  unit         TEXT NOT NULL DEFAULT 'inches' CHECK (unit IN ('inches', 'cm')),
  notes        TEXT,
  is_template  BOOLEAN NOT NULL DEFAULT FALSE,
  design_images TEXT[] NOT NULL DEFAULT '{}',
  taken_by     TEXT,
  taken_at     DATE,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX measurement_profiles_shop_id_idx       ON measurement_profiles(shop_id);
CREATE INDEX measurement_profiles_customer_id_idx   ON measurement_profiles(customer_id);
CREATE INDEX measurement_profiles_template_idx      ON measurement_profiles(shop_id, is_template);

CREATE TRIGGER measurement_profiles_updated_at
  BEFORE UPDATE ON measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id            UUID NOT NULL REFERENCES customers(id),
  customer_name          TEXT NOT NULL,
  customer_phone         TEXT,
  order_number           TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','cutting','sewing','finishing','ready','delivered','cancelled')),
  priority               TEXT NOT NULL DEFAULT 'normal'
                         CHECK (priority IN ('low','normal','high','urgent')),
  due_date               DATE,
  delivery_date          DATE,
  items                  JSONB NOT NULL DEFAULT '[]',
  measurement_profile_id UUID REFERENCES measurement_profiles(id),
  custom_measurements    JSONB,
  measurement_category   TEXT,
  material_usage         JSONB NOT NULL DEFAULT '[]',
  style_notes            TEXT,
  design_images          TEXT[] NOT NULL DEFAULT '{}',
  internal_notes         TEXT,
  -- Pricing
  subtotal               NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount               NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_type          TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
  tax                    NUMERIC(14,2) NOT NULL DEFAULT 0,
  total                  NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid            NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status         TEXT NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid','partial','paid')),
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce unique order number per shop
  CONSTRAINT orders_shop_number_unique UNIQUE (shop_id, order_number)
);

CREATE INDEX orders_shop_id_idx         ON orders(shop_id);
CREATE INDEX orders_customer_id_idx     ON orders(customer_id);
CREATE INDEX orders_status_idx          ON orders(shop_id, status);
CREATE INDEX orders_due_date_idx        ON orders(shop_id, due_date);
CREATE INDEX orders_payment_status_idx  ON orders(shop_id, payment_status);
CREATE INDEX orders_deleted_idx         ON orders(shop_id, is_deleted);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Order Events (immutable timeline) ────────────────────────────────────────
CREATE TABLE order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: events are immutable
);

CREATE INDEX order_events_order_id_idx ON order_events(order_id, created_at DESC);

-- ── Materials ─────────────────────────────────────────────────────────────────
CREATE TABLE materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (length(name) > 0),
  category          TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'yard',
  sku               TEXT,
  color             TEXT,
  description       TEXT,
  image_url         TEXT,
  current_stock     NUMERIC(12,3) NOT NULL DEFAULT 0,
  minimum_stock     NUMERIC(12,3) NOT NULL DEFAULT 0,
  current_unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  average_unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX materials_shop_id_idx    ON materials(shop_id);
CREATE INDEX materials_category_idx   ON materials(shop_id, category);
CREATE INDEX materials_name_trgm_idx  ON materials USING GIN (name gin_trgm_ops);

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Material Price History ────────────────────────────────────────────────────
CREATE TABLE material_price_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id         UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  unit_cost           NUMERIC(12,4) NOT NULL,
  quantity_purchased  NUMERIC(12,3) NOT NULL DEFAULT 0,
  total_cost          NUMERIC(14,2) NOT NULL DEFAULT 0,
  supplier            TEXT,
  purchase_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  receipt_url         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX material_price_history_material_idx ON material_price_history(material_id, purchase_date DESC);

-- ── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES orders(id),
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method     TEXT NOT NULL DEFAULT 'cash'
             CHECK (method IN ('cash','card','bank_transfer','mobile_money','other')),
  reference  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_shop_id_idx  ON payments(shop_id, created_at DESC);
CREATE INDEX payments_order_id_idx ON payments(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- All policies enforce: authenticated user's shop_id = row's shop_id
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper function: get the current user's shop_id from their JWT or shops table
CREATE OR REPLACE FUNCTION get_my_shop_id()
RETURNS UUID AS $$
  SELECT id FROM shops WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE shops                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials              ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;

-- ── Shops policies ──
CREATE POLICY "Users can view their own shop"
  ON shops FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own shop"
  ON shops FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own shop"
  ON shops FOR UPDATE USING (owner_id = auth.uid());

-- ── Customers policies ──
CREATE POLICY "Shop members can view customers"
  ON customers FOR SELECT USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop members can insert customers"
  ON customers FOR INSERT WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "Shop members can update customers"
  ON customers FOR UPDATE USING (shop_id = get_my_shop_id());

-- ── Measurement profiles policies ──
CREATE POLICY "Shop members can manage measurement profiles"
  ON measurement_profiles FOR ALL USING (shop_id = get_my_shop_id());

-- ── Orders policies ──
CREATE POLICY "Shop members can manage orders"
  ON orders FOR ALL USING (shop_id = get_my_shop_id());

-- ── Order events policies ──
CREATE POLICY "Shop members can view order events"
  ON order_events FOR SELECT USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop members can insert order events"
  ON order_events FOR INSERT WITH CHECK (shop_id = get_my_shop_id());

-- ── Materials policies ──
CREATE POLICY "Shop members can manage materials"
  ON materials FOR ALL USING (shop_id = get_my_shop_id());

-- ── Material price history policies ──
CREATE POLICY "Shop members can manage price history"
  ON material_price_history FOR ALL USING (shop_id = get_my_shop_id());

-- ── Payments policies ──
CREATE POLICY "Shop members can manage payments"
  ON payments FOR ALL USING (shop_id = get_my_shop_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- Enable realtime for tables that benefit from live sync
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE materials;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for Realtime performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX orders_updated_at_idx    ON orders(updated_at DESC);
CREATE INDEX customers_updated_at_idx ON customers(updated_at DESC);
CREATE INDEX materials_updated_at_idx ON materials(updated_at DESC);
