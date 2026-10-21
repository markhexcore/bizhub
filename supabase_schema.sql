-- BizHub Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- BUSINESSES TABLE
-- ==========================================
CREATE TABLE businesses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  logo_url TEXT,
  cover_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- BUSINESS PHOTOS TABLE
-- ==========================================
CREATE TABLE business_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Businesses: public read, owner write
CREATE POLICY "Businesses are publicly readable"
  ON businesses FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own business"
  ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their business"
  ON businesses FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their business"
  ON businesses FOR DELETE USING (auth.uid() = owner_id);

-- Photos: public read, business owner write
CREATE POLICY "Photos are publicly readable"
  ON business_photos FOR SELECT USING (TRUE);

CREATE POLICY "Business owners can insert photos"
  ON business_photos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Business owners can delete photos"
  ON business_photos FOR DELETE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- Transactions: owner only
CREATE POLICY "Owners can view their transactions"
  ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can insert transactions"
  ON transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can update transactions"
  ON transactions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete transactions"
  ON transactions FOR DELETE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', TRUE);

CREATE POLICY "Public read access on business-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'business-media');

CREATE POLICY "Authenticated users can upload to business-media"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'business-media' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own objects"
  ON storage.objects FOR UPDATE USING (auth.uid() = owner);

CREATE POLICY "Users can delete their own objects"
  ON storage.objects FOR DELETE USING (auth.uid() = owner);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Owners can insert products"
  ON products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can update products"
  ON products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete products"
  ON products FOR DELETE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an order
CREATE POLICY "Public can create orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Business owners can view orders for their businesses
CREATE POLICY "Owners can view orders"
  ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- Business owners can update order status
CREATE POLICY "Owners can update orders"
  ON orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );

-- ==========================================
-- ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12, 2) NOT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert order items"
  ON order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can view order items"
  ON order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN businesses ON businesses.id = orders.business_id
      WHERE orders.id = order_items.order_id AND businesses.owner_id = auth.uid()
    )
  );

