-- Fix DGA and PD product functions to use proper hierarchical filtering
-- Also add a function to get Level 2 products by specific parent IDs

-- Update get_dga_products to use proper Level 1 relationships
DROP FUNCTION IF EXISTS public.get_dga_products();

CREATE OR REPLACE FUNCTION public.get_dga_products()
 RETURNS TABLE(id text, name text, description text, price numeric, cost numeric, enabled boolean, category text, subcategory text, parent_product_id text, part_number text, image_url text, product_info_url text, specifications jsonb)
 LANGUAGE sql
 STABLE
AS $function$
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
    AND p.product_level = 1
    AND (p.id = 'dga' OR p.category = 'DGA' OR p.subcategory = 'DGA')
  ORDER BY p.name;
$function$

-- Update get_pd_products to use proper Level 1 relationships  
DROP FUNCTION IF EXISTS public.get_pd_products();

CREATE OR REPLACE FUNCTION public.get_pd_products()
 RETURNS TABLE(id text, name text, description text, price numeric, cost numeric, enabled boolean, category text, subcategory text, parent_product_id text, part_number text, image_url text, product_info_url text, specifications jsonb)
 LANGUAGE sql
 STABLE
AS $function$
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
    AND p.product_level = 1
    AND (p.id = 'partial-discharge' OR p.category = 'PD' OR p.subcategory = 'PD' OR p.id = 'qpdm')
  ORDER BY p.name;
$function$

-- Create function to get Level 2 products with proper parent filtering
CREATE OR REPLACE FUNCTION public.get_level2_products_for_category(category_filter text)
 RETURNS TABLE(id text, name text, description text, price numeric, cost numeric, enabled boolean, category text, subcategory text, parent_product_id text, part_number text, image_url text, product_info_url text, specifications jsonb, chassis_type text)
 LANGUAGE sql
 STABLE
AS $function$
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
    p.chassis_type
  FROM products p
  WHERE p.enabled = true 
    AND p.product_level = 2
    AND (
      (category_filter = 'dga' AND (p.parent_product_id = 'dga' OR p.category = 'DGA' OR p.subcategory = 'DGA'))
      OR 
      (category_filter = 'pd' AND (p.parent_product_id = 'partial-discharge' OR p.parent_product_id = 'qpdm' OR p.category = 'PD' OR p.subcategory = 'PD'))
      OR
      (category_filter = 'qtms' AND (p.parent_product_id = 'qtms' OR p.category = 'QTMS'))
    )
  ORDER BY p.name;
$function$