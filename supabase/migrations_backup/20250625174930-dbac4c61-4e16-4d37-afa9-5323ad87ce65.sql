
-- Add placeholder product for QTMS configurations to resolve foreign key constraints
INSERT INTO products (id, name, description, price, cost, category, subcategory, is_active) 
VALUES ('QTMS_CONFIGURATION', 'QTMS Configuration', 'Dynamic QTMS configuration placeholder', 0, 0, 'QTMS', 'Configuration', true)
ON CONFLICT (id) DO NOTHING;

-- Add placeholder product for DGA configurations
INSERT INTO products (id, name, description, price, cost, category, subcategory, is_active) 
VALUES ('DGA_CONFIGURATION', 'DGA Configuration', 'Dynamic DGA configuration placeholder', 0, 0, 'DGA', 'Configuration', true)
ON CONFLICT (id) DO NOTHING;
