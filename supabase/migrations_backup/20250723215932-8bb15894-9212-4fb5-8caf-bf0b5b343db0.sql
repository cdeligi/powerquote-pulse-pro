-- Create optimized RPC functions for better performance

-- Function for Level 1 products with asset types
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
    COALESCE(at.name, 'Uncategorized') as asset_type_name
  FROM products p
  LEFT JOIN asset_types at ON p.asset_type_id = at.id
  WHERE p.product_level = 1 
    AND p.enabled = true
  ORDER BY p.name;
$$;

-- Function for Level 2 products by parent
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