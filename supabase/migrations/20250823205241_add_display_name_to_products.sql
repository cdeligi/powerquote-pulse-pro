-- Add display_name column to products table
ALTER TABLE products 
ADD COLUMN display_name TEXT;

-- Set initial value to match the name column
UPDATE products SET display_name = name;

-- Make the column NOT NULL after setting default values
ALTER TABLE products 
ALTER COLUMN display_name SET NOT NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_display_name ON products(display_name);

-- Update RPC functions to include display_name in their return types
-- This ensures the display_name is available in the application
CREATE OR REPLACE FUNCTION public.get_products_by_level(level_filter integer)
 RETURNS TABLE(id text, name text, display_name text, description text, price numeric, cost numeric, enabled boolean, category text, subcategory text, parent_product_id text, part_number text, image_url text, product_info_url text, specifications jsonb, slot_requirement integer, chassis_type text)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    p.id,
    p.name,
    p.display_name,
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
$function$;
