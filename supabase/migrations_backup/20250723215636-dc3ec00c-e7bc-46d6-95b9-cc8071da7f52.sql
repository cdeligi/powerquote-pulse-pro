-- Phase 1: Add Asset Type Structure and Fix Product Hierarchy

-- Create asset_types table for Level 1 categorization
CREATE TABLE IF NOT EXISTS public.asset_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert standard asset types
INSERT INTO public.asset_types (id, name, description, display_order) VALUES
('power-transformer', 'Power Transformer', 'Power transformer monitoring systems', 1),
('breakers', 'Breakers', 'Circuit breaker monitoring systems', 2),
('gas-insulated-switchgear', 'Gas Insulated Switchgear', 'GIS monitoring systems', 3),
('reactor', 'Reactor', 'Reactor monitoring systems', 4),
('capacitor-bank', 'Capacitor Bank', 'Capacitor bank monitoring systems', 5)
ON CONFLICT (id) DO NOTHING;

-- Add asset_type_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS asset_type_id TEXT REFERENCES public.asset_types(id);

-- Update existing Level 1 products with proper asset type categorization
UPDATE public.products 
SET asset_type_id = 'power-transformer'
WHERE product_level = 1 AND subcategory IN ('QTMS', 'DGA', 'PD');

-- Create optimized indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_level_enabled_asset ON products (product_level, enabled, asset_type_id);
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory_enabled ON products (category, subcategory, enabled);
CREATE INDEX IF NOT EXISTS idx_products_parent_enabled ON products (parent_product_id, enabled);

-- Create optimized RPC function for Level 1 products with asset types
CREATE OR REPLACE FUNCTION get_level1_products_with_asset_types()
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  cost numeric,
  enabled boolean,
  category text,
  subcategory text,
  part_number text,
  image_url text,
  product_info_url text,
  specifications jsonb,
  asset_type_id text,
  asset_type_name text
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.enabled,
    p.category,
    p.subcategory,
    p.part_number,
    p.image_url,
    p.product_info_url,
    p.specifications,
    p.asset_type_id,
    at.name as asset_type_name
  FROM products p
  LEFT JOIN asset_types at ON p.asset_type_id = at.id
  WHERE p.product_level = 1 
    AND p.enabled = true
  ORDER BY at.display_order, p.name;
$$;

-- Create optimized RPC function for Level 2 products by parent
CREATE OR REPLACE FUNCTION get_level2_products_by_parent(parent_id text)
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  cost numeric,
  enabled boolean,
  category text,
  subcategory text,
  parent_product_id text,
  part_number text,
  image_url text,
  product_info_url text,
  specifications jsonb
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.enabled,
    p.category,
    p.subcategory,
    p.parent_product_id,
    p.part_number,
    p.image_url,
    p.product_info_url,
    p.specifications
  FROM products p
  WHERE p.product_level = 2 
    AND p.enabled = true
    AND p.parent_product_id = parent_id
  ORDER BY p.name;
$$;

-- Create optimized RPC function for Level 3 products by parent
CREATE OR REPLACE FUNCTION get_level3_products_by_parent(parent_id text)
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  cost numeric,
  enabled boolean,
  category text,
  subcategory text,
  parent_product_id text,
  part_number text,
  image_url text,
  product_info_url text,
  specifications jsonb,
  slot_requirement integer
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.enabled,
    p.category,
    p.subcategory,
    p.parent_product_id,
    p.part_number,
    p.image_url,
    p.product_info_url,
    p.specifications,
    p.slot_requirement
  FROM products p
  WHERE p.product_level = 3 
    AND p.enabled = true
    AND p.parent_product_id = parent_id
  ORDER BY p.name;
$$;

-- Enable RLS on asset_types
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for asset_types
CREATE POLICY "Anyone can view asset types" 
ON public.asset_types 
FOR SELECT 
USING (enabled = true);

CREATE POLICY "Admins can manage asset types" 
ON public.asset_types 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Update get_dga_products function to use proper filtering
CREATE OR REPLACE FUNCTION get_dga_products()
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  cost numeric,
  enabled boolean,
  category text,
  subcategory text,
  parent_product_id text,
  part_number text,
  image_url text,
  product_info_url text,
  specifications jsonb
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.enabled,
    p.category,
    p.subcategory,
    p.parent_product_id,
    p.part_number,
    p.image_url,
    p.product_info_url,
    p.specifications
  FROM products p
  WHERE p.enabled = true 
    AND (
      (p.product_level = 1 AND p.subcategory = 'DGA') OR
      (p.product_level = 2 AND p.parent_product_id = 'dga')
    )
  ORDER BY p.product_level, p.name;
$$;

-- Update get_pd_products function to use proper filtering
CREATE OR REPLACE FUNCTION get_pd_products()
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  cost numeric,
  enabled boolean,
  category text,
  subcategory text,
  parent_product_id text,
  part_number text,
  image_url text,
  product_info_url text,
  specifications jsonb
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.cost,
    p.enabled,
    p.category,
    p.subcategory,
    p.parent_product_id,
    p.part_number,
    p.image_url,
    p.product_info_url,
    p.specifications
  FROM products p
  WHERE p.enabled = true 
    AND (
      (p.product_level = 1 AND p.subcategory = 'PD') OR
      (p.product_level = 2 AND p.parent_product_id = 'partial-discharge')
    )
  ORDER BY p.product_level, p.name;