
-- Add configuration support to bom_items table
ALTER TABLE public.bom_items 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS configuration_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_quote_item_id uuid DEFAULT NULL;

-- Add comment to clarify the new columns
COMMENT ON COLUMN public.bom_items.product_type IS 'Type of product: standard, qtms_configuration, dga_configuration, etc.';
COMMENT ON COLUMN public.bom_items.configuration_data IS 'JSON data containing component details for configured products';
COMMENT ON COLUMN public.bom_items.parent_quote_item_id IS 'Reference to parent item for component breakdown';
