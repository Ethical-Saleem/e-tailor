-- supabase/migrations/003_material_movements.sql

CREATE TABLE material_stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES materials(id),
  order_id      UUID REFERENCES orders(id),           -- null for manual adjustments / sales
  movement_type TEXT NOT NULL
                CHECK (movement_type IN (
                  'purchase',       -- stock in from supplier
                  'order_consume',  -- consumed for an order (shop-supplied)
                  'order_reverse',  -- reversal when order cancelled or material removed
                  'manual_in',      -- manual stock correction (positive)
                  'manual_out',     -- manual stock correction (negative)
                  'sold'            -- sold directly (not via an order)
                )),
  quantity      NUMERIC(12,3) NOT NULL,   -- always positive; sign implied by movement_type
  unit          TEXT NOT NULL,
  unit_cost     NUMERIC(12,4) NOT NULL DEFAULT 0,
  note          TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Immutable: no updated_at
);

CREATE INDEX material_stock_movements_material_idx
  ON material_stock_movements(material_id, created_at DESC);
CREATE INDEX material_stock_movements_order_idx
  ON material_stock_movements(order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX material_stock_movements_shop_idx
  ON material_stock_movements(shop_id, created_at DESC);

ALTER TABLE material_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can manage stock movements"
  ON material_stock_movements FOR ALL USING (shop_id = get_my_shop_id());

ALTER PUBLICATION supabase_realtime ADD TABLE material_stock_movements;