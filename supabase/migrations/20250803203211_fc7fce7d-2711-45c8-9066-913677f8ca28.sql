-- Drop and recreate the function with chassis_type field
DROP FUNCTION IF EXISTS public.get_level2_products_by_parent(text);

CREATE OR REPLACE FUNCTION public.get_level2_products_by_parent(parent_id text)
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
    AND p.parent_product_id = parent_id
  ORDER BY p.name;
$function$