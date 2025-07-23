-- Performance optimization: Add essential indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_level_enabled ON products (product_level, enabled);
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory ON products (category, subcategory);
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON products (parent_product_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles (role, user_status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_status ON quotes (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bom_items_quote_id ON bom_items (quote_id);

-- Create a fast RPC function for loading all products by level
CREATE OR REPLACE FUNCTION get_products_by_level(level_filter int)
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
  WHERE p.product_level = level_filter 
    AND p.enabled = true
  ORDER BY p.name;
$$;

-- Create optimized function for DGA products
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
    AND (p.category = 'DGA' OR p.subcategory = 'DGA' OR p.name ILIKE '%DGA%' OR p.name ILIKE '%TM%')
  ORDER BY p.name;
$$;

-- Create optimized function for PD products
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
    AND (p.category = 'PD' OR p.subcategory = 'PD' OR p.name ILIKE '%PD%' OR p.name ILIKE '%QPDM%')
  ORDER BY p.name;
$$;