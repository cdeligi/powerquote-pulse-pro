
-- Remove the foreign key constraint that's causing quote submission failures
ALTER TABLE public.bom_items 
DROP CONSTRAINT IF EXISTS bom_items_product_id_fkey;

-- Add a comment to document why we removed the constraint
COMMENT ON COLUMN public.bom_items.product_id IS 'Product identifier - may reference products table or be a custom/configuration ID';
