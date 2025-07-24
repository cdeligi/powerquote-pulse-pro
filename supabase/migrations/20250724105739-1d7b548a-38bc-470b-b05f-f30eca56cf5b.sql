-- Add asset_type_id field to products table for Level 1 products
-- This will replace the existing 'type' field usage

-- Add asset_type_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS asset_type_id text REFERENCES asset_types(id);

-- Update existing Level 1 products to have default asset type "Power Transformer"
-- First, ensure we have a "Power Transformer" asset type
INSERT INTO asset_types (id, name, description, enabled)
VALUES ('power-transformer', 'Power Transformer', 'Power transformer monitoring and diagnostic equipment', true)
ON CONFLICT (id) DO NOTHING;

-- Set default asset_type_id for existing Level 1 products that don't have one
UPDATE products 
SET asset_type_id = 'power-transformer'
WHERE product_level = 1 AND asset_type_id IS NULL;

-- Create index for better performance on asset_type_id lookups
CREATE INDEX IF NOT EXISTS idx_products_asset_type_id ON products(asset_type_id);

-- Add a rack_configurable column to products table for Level 1 products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rack_configurable boolean DEFAULT false;

-- Set QTMS products as rack configurable
UPDATE products 
SET rack_configurable = true
WHERE product_level = 1 AND (subcategory = 'QTMS' OR name ILIKE '%QTMS%');