-- Fix get_dga_products function to remove broad text matching
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
    AND (p.category = 'DGA' OR p.subcategory = 'DGA')
  ORDER BY p.name;
$function$;

-- Fix get_pd_products function to remove broad text matching
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
    AND (p.category = 'PD' OR p.subcategory = 'PD')
  ORDER BY p.name;
$function$;

-- Create missing get_level2_products_for_category function
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
  WHERE p.product_level = 2 
    AND p.enabled = true
    AND (p.category = category_filter OR p.subcategory = category_filter)
  ORDER BY p.name;
$function$;