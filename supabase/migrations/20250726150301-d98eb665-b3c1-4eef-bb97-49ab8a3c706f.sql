-- Drop existing function and recreate with chassis_type field
DROP FUNCTION IF EXISTS public.get_products_by_level(integer);

CREATE OR REPLACE FUNCTION public.get_products_by_level(level_filter integer)
 RETURNS TABLE(id text, name text, description text, price numeric, cost numeric, enabled boolean, category text, subcategory text, parent_product_id text, part_number text, image_url text, product_info_url text, specifications jsonb, slot_requirement integer, chassis_type text)
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
    p.slot_requirement,
    p.chassis_type
  FROM products p
  WHERE p.product_level = level_filter 
    AND p.enabled = true
  ORDER BY p.name;
$function$