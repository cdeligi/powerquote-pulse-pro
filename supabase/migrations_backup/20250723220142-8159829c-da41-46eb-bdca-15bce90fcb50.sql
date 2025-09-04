-- Fix DGA and PD product filtering to use correct parent relationships

-- Update get_dga_products function to properly filter DGA products
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
  specifications jsonb,
  product_level integer
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
    p.product_level
  FROM products p
  WHERE p.enabled = true 
    AND (
      (p.product_level = 1 AND p.subcategory = 'DGA') OR
      (p.product_level = 2 AND EXISTS (
        SELECT 1 FROM products parent 
        WHERE parent.id = p.parent_product_id 
        AND parent.subcategory = 'DGA'
      ))
    )
  ORDER BY p.product_level, p.name;
$$;

-- Update get_pd_products function to properly filter PD products
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
  specifications jsonb,
  product_level integer
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
    p.product_level
  FROM products p
  WHERE p.enabled = true 
    AND (
      (p.product_level = 1 AND p.subcategory = 'PD') OR
      (p.product_level = 2 AND EXISTS (
        SELECT 1 FROM products parent 
        WHERE parent.id = p.parent_product_id 
        AND parent.subcategory = 'PD'
      ))
    )
  ORDER BY p.product_level, p.name;
$$;

-- Create function to get QTMS chassis (Level 2 products for QTMS)
CREATE OR REPLACE FUNCTION get_qtms_chassis()
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
    AND p.product_level = 2
    AND p.category = 'chassis'
    AND p.subcategory IN ('LTX', 'MTX', 'STX')
    AND EXISTS (
      SELECT 1 FROM products parent 
      WHERE parent.id = p.parent_product_id 
      AND parent.subcategory = 'QTMS'
    )
  ORDER BY p.name;
$$;