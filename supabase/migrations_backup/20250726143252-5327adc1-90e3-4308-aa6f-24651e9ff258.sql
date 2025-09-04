-- Add chassis_type column to products table for Level 2 products
ALTER TABLE public.products 
ADD COLUMN chassis_type text DEFAULT 'N/A';

-- Update existing Level 2 products to set chassis_type based on their names
UPDATE public.products 
SET chassis_type = CASE 
  WHEN name ILIKE '%LTX%' THEN 'LTX'
  WHEN name ILIKE '%MTX%' THEN 'MTX' 
  WHEN name ILIKE '%STX%' THEN 'STX'
  ELSE 'N/A'
END
WHERE product_level = 2;

-- Add comment for documentation
COMMENT ON COLUMN public.products.chassis_type IS 'Chassis type for Level 2 products: N/A, LTX, MTX, STX. Used to drive rack configurator display in BOM Builder.';