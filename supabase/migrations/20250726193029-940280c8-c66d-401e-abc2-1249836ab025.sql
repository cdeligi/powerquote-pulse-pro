-- Phase 1: Remove Level 1 Product Pricing
-- Level 1 products should not have pricing as they are umbrella categories
UPDATE products 
SET price = NULL, cost = NULL
WHERE product_level = 1;

-- Phase 2: Fix Product Hierarchy - Ensure chassis products have correct parent relationships
-- First, let's check current relationships and fix any incorrect ones

-- LTX, MTX, STX should only be under QTMS parent
UPDATE products 
SET parent_product_id = 'QTMS'
WHERE id IN ('LTX', 'MTX', 'STX') 
  AND product_level = 2;

-- Ensure DGA Level 2 products have correct parent
UPDATE products 
SET parent_product_id = 'DGA'
WHERE category = 'DGA' 
  AND product_level = 2 
  AND parent_product_id != 'DGA';

-- Ensure PD Level 2 products have correct parent  
UPDATE products 
SET parent_product_id = 'PD'
WHERE category = 'PD' 
  AND product_level = 2 
  AND parent_product_id != 'PD';

-- Create/update the relationship tables to ensure proper hierarchy
INSERT INTO level1_level2_relationships (level1_product_id, level2_product_id)
SELECT DISTINCT p1.id, p2.id
FROM products p1
JOIN products p2 ON p2.parent_product_id = p1.id
WHERE p1.product_level = 1 
  AND p2.product_level = 2
  AND NOT EXISTS (
    SELECT 1 FROM level1_level2_relationships r 
    WHERE r.level1_product_id = p1.id 
    AND r.level2_product_id = p2.id
  );