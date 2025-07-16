
-- Fix product relationships and populate relationship tables
-- First, let's populate the level1_level2_relationships table based on existing data patterns
INSERT INTO level1_level2_relationships (level1_product_id, level2_product_id)
SELECT DISTINCT 
    l1.id as level1_product_id,
    l2.id as level2_product_id
FROM products l1
JOIN products l2 ON (
    (l1.subcategory = 'QTMS' AND l2.subcategory IN ('LTX', 'MTX', 'STX')) OR
    (l1.subcategory = 'TM8' AND l2.subcategory = 'Standard') OR
    (l1.subcategory = 'TM3' AND l2.subcategory = 'Standard') OR
    (l1.subcategory = 'TM1' AND l2.subcategory = 'Standard') OR
    (l1.subcategory = 'QPDM' AND l2.subcategory = 'Standard')
)
WHERE l1.category = 'level1' AND l2.category = 'level2'
ON CONFLICT (level1_product_id, level2_product_id) DO NOTHING;

-- Populate level2_level3_relationships table based on logical groupings
INSERT INTO level2_level3_relationships (level2_product_id, level3_product_id)
SELECT DISTINCT 
    l2.id as level2_product_id,
    l3.id as level3_product_id
FROM products l2
JOIN products l3 ON (
    -- QTMS chassis can use cards
    (l2.subcategory IN ('LTX', 'MTX', 'STX') AND l3.subcategory = 'card') OR
    -- All level2 products can use accessories
    (l3.subcategory = 'accessory')
)
WHERE l2.category = 'level2' AND l3.category = 'level3'
ON CONFLICT (level2_product_id, level3_product_id) DO NOTHING;

-- Update products table to ensure consistent data structure
UPDATE products 
SET 
    subcategory = COALESCE(subcategory, 'Standard'),
    is_active = COALESCE(is_active, true),
    price = COALESCE(price, 0),
    cost = COALESCE(cost, 0)
WHERE subcategory IS NULL OR price IS NULL OR cost IS NULL;

-- Ensure we have some basic Level 1 products if none exist
INSERT INTO products (id, name, category, subcategory, description, price, cost, is_active)
VALUES 
    ('qtms', 'QTMS', 'level1', 'QTMS', 'Qualitrol Transformer Monitoring System', 5000, 2500, true),
    ('tm8', 'TM8', 'level1', 'TM8', 'Transformer Monitor 8-Channel', 3000, 1500, true),
    ('dga', 'DGA', 'level1', 'DGA', 'Dissolved Gas Analysis', 8000, 4000, true),
    ('partial-discharge', 'Partial Discharge', 'level1', 'QPDM', 'Partial Discharge Monitor', 6000, 3000, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    cost = EXCLUDED.cost,
    is_active = EXCLUDED.is_active;

-- Ensure we have some Level 2 products
INSERT INTO products (id, name, category, subcategory, description, price, cost, is_active)
VALUES 
    ('ltx-chassis', 'LTX Chassis', 'level2', 'LTX', 'Large Transformer Chassis - 19 slots', 2000, 1000, true),
    ('mtx-chassis', 'MTX Chassis', 'level2', 'MTX', 'Medium Transformer Chassis - 12 slots', 1500, 750, true),
    ('stx-chassis', 'STX Chassis', 'level2', 'STX', 'Small Transformer Chassis - 6 slots', 1000, 500, true),
    ('tm8-standard', 'TM8 Standard', 'level2', 'Standard', 'Standard TM8 Configuration', 3000, 1500, true),
    ('dga-standard', 'DGA Standard', 'level2', 'Standard', 'Standard DGA Configuration', 8000, 4000, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    cost = EXCLUDED.cost,
    is_active = EXCLUDED.is_active;

-- Ensure we have some Level 3 products
INSERT INTO products (id, name, category, subcategory, description, price, cost, is_active)
VALUES 
    ('analog-card', 'Analog Input Card', 'level3', 'card', '8-Channel Analog Input Card', 500, 250, true),
    ('digital-card', 'Digital I/O Card', 'level3', 'card', '16-Channel Digital I/O Card', 400, 200, true),
    ('communication-card', 'Communication Card', 'level3', 'card', 'Ethernet/Serial Communication Card', 600, 300, true),
    ('power-supply', 'Power Supply', 'level3', 'accessory', 'Universal Power Supply Unit', 300, 150, true),
    ('mounting-kit', 'Mounting Kit', 'level3', 'accessory', 'Standard Mounting Hardware', 100, 50, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    cost = EXCLUDED.cost,
    is_active = EXCLUDED.is_active;

-- Update the relationship tables with the new products
INSERT INTO level1_level2_relationships (level1_product_id, level2_product_id)
VALUES 
    ('qtms', 'ltx-chassis'),
    ('qtms', 'mtx-chassis'),
    ('qtms', 'stx-chassis'),
    ('tm8', 'tm8-standard'),
    ('dga', 'dga-standard')
ON CONFLICT (level1_product_id, level2_product_id) DO NOTHING;

INSERT INTO level2_level3_relationships (level2_product_id, level3_product_id)
VALUES 
    ('ltx-chassis', 'analog-card'),
    ('ltx-chassis', 'digital-card'),
    ('ltx-chassis', 'communication-card'),
    ('mtx-chassis', 'analog-card'),
    ('mtx-chassis', 'digital-card'),
    ('stx-chassis', 'analog-card'),
    ('tm8-standard', 'power-supply'),
    ('tm8-standard', 'mounting-kit'),
    ('dga-standard', 'power-supply'),
    ('dga-standard', 'mounting-kit')
ON CONFLICT (level2_product_id, level3_product_id) DO NOTHING;
