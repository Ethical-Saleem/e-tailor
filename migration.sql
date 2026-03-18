-- shops (multi-tenant root)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  phone TEXT,
  address TEXT,
  currency TEXT DEFAULT 'USD',
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- measurement_profiles (reusable per customer)
CREATE TABLE measurement_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,              -- e.g. "Wedding Suit 2024"
  category TEXT NOT NULL,           -- shirt, trouser, dress, gown, etc.
  measurements JSONB NOT NULL,      -- flexible key-value pairs
  notes TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  order_number TEXT UNIQUE NOT NULL, -- e.g. ORD-2024-0042
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | cutting | sewing | finishing | ready | delivered | cancelled
  priority TEXT DEFAULT 'normal',   -- low | normal | high | urgent
  due_date DATE,
  delivery_date DATE,
  items JSONB NOT NULL DEFAULT '[]', -- array of order items
  measurement_profile_id UUID REFERENCES measurement_profiles(id),
  custom_measurements JSONB,         -- override per order
  material_usage JSONB DEFAULT '[]', -- materials used with quantities
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid | partial | paid
  deposit_amount NUMERIC(12,2) DEFAULT 0,
  design_images TEXT[] DEFAULT '{}',
  style_notes TEXT,
  internal_notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_timeline (activity log)
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id),
  event_type TEXT NOT NULL,         -- status_change | payment | note | reminder
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- materials (inventory)
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,           -- fabric | thread | button | lining | trim | tool | other
  unit TEXT NOT NULL DEFAULT 'yard', -- yard | meter | piece | roll | kg | spool
  sku TEXT,
  color TEXT,
  description TEXT,
  image_url TEXT,
  current_stock NUMERIC(12,3) DEFAULT 0,
  minimum_stock NUMERIC(12,3) DEFAULT 0,  -- low-stock alert threshold
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- material_price_history
CREATE TABLE material_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id),
  unit_cost NUMERIC(12,4) NOT NULL,
  quantity_purchased NUMERIC(12,3),
  supplier TEXT,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT DEFAULT 'cash',       -- cash | card | transfer | mobile_money
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) - all tables
-- Every table has: shop_id must match authenticated user's shop