
-- Allow Level 2 products to belong to multiple Level 1 products
-- The existing level1_level2_relationships table already supports this many-to-many relationship

-- Allow Level 3 products to belong to multiple Level 2 products  
-- The existing level2_level3_relationships table already supports this many-to-many relationship

-- Add unique constraints to prevent duplicate relationships
ALTER TABLE level1_level2_relationships 
ADD CONSTRAINT unique_level1_level2_relationship 
UNIQUE (level1_product_id, level2_product_id);

ALTER TABLE level2_level3_relationships 
ADD CONSTRAINT unique_level2_level3_relationship 
UNIQUE (level2_product_id, level3_product_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_level1_level2_level1 ON level1_level2_relationships(level1_product_id);
CREATE INDEX IF NOT EXISTS idx_level1_level2_level2 ON level1_level2_relationships(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_level2_level3_level2 ON level2_level3_relationships(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_level2_level3_level3 ON level2_level3_relationships(level3_product_id);
