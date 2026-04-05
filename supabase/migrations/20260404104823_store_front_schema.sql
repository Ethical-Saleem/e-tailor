CREATE TABLE store_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (length(title) > 0),
  description       TEXT,
  category          TEXT NOT NULL,              -- reuses GarmentCategory values
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','in_production','ready','sold','archived')),
  -- Measurements (optional template link or inline)
  measurement_profile_id UUID REFERENCES measurement_profiles(id),
  size_label        TEXT,                       -- e.g. "M", "UK 12", "42"
  -- Materials
  material_usage    JSONB NOT NULL DEFAULT '[]',  -- same MaterialUsageEntry shape as orders
  -- Costing
  material_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,   -- sum of inventory-cost lines
  additional_costs  JSONB NOT NULL DEFAULT '[]',
  cost_price        NUMERIC(14,2) NOT NULL DEFAULT 0,   -- total production cost
  selling_price     NUMERIC(14,2) NOT NULL DEFAULT 0,   -- tailor's asking price
  -- Media
  design_images     TEXT[] NOT NULL DEFAULT '{}',
  -- Sale record (populated on sale)
  sold_at           TIMESTAMPTZ,
  sold_price        NUMERIC(14,2),
  sold_to_name      TEXT,
  sold_to_phone     TEXT,
  sale_payment_method TEXT CHECK (
    sale_payment_method IN ('cash','card','bank_transfer','mobile_money','other')
  ),
  sale_notes        TEXT,
  -- Soft delete
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX store_items_shop_id_idx      ON store_items(shop_id);
CREATE INDEX store_items_status_idx       ON store_items(shop_id, status);
CREATE INDEX store_items_category_idx     ON store_items(shop_id, category);
CREATE INDEX store_items_deleted_idx      ON store_items(shop_id, is_deleted);
CREATE INDEX store_items_updated_at_idx   ON store_items(updated_at DESC);
 
CREATE TRIGGER store_items_updated_at
  BEFORE UPDATE ON store_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
 
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY "Shop members can manage store items"
  ON store_items FOR ALL USING (shop_id = get_my_shop_id());
 
-- Track stock movements from store item production
-- (reuses material_stock_movements; movement_type 'order_consume' → for items
--  we add two new movement types via ALTER)
ALTER TABLE material_stock_movements
  DROP CONSTRAINT material_stock_movements_movement_type_check;
 
ALTER TABLE material_stock_movements
  ADD CONSTRAINT material_stock_movements_movement_type_check
  CHECK (movement_type IN (
    'purchase',
    'order_consume',
    'order_reverse',
    'store_item_consume',   -- stock deducted for a store item
    'store_item_reverse',   -- stock returned (item archived/deleted before sold)
    'manual_in',
    'manual_out',
    'sold'
  ));
 
-- Link movements to store items
ALTER TABLE material_stock_movements
  ADD COLUMN store_item_id UUID REFERENCES store_items(id);
 
CREATE INDEX material_movements_store_item_idx
  ON material_stock_movements(store_item_id)
  WHERE store_item_id IS NOT NULL;
 
ALTER PUBLICATION supabase_realtime ADD TABLE store_items;
