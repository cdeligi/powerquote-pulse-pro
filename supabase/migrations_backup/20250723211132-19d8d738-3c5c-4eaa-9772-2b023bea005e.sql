-- PowerQuotePro: Complete Database Schema Update for Real Product Data
-- Work with existing schema and add required fields

-- 1. Add missing required columns for proper product management
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rack_configurable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_product_id text,
ADD COLUMN IF NOT EXISTS product_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS slot_requirement integer,
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS part_number text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS product_info_url text;

-- 2. Update existing data to have proper product levels
UPDATE products SET product_level = 1 WHERE category = 'level1' OR category = 'monitoring-systems';
UPDATE products SET product_level = 2 WHERE category = 'level2' OR category = 'chassis' OR category = 'monitor';  
UPDATE products SET product_level = 3 WHERE category = 'level3' OR category = 'card';

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_level ON products(product_level);
CREATE INDEX IF NOT EXISTS idx_products_parent ON products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_enabled ON products(enabled);
CREATE INDEX IF NOT EXISTS idx_products_rack_configurable ON products(rack_configurable);

-- 4. Clear and insert Level 1 products with rack_configurable settings
DELETE FROM products WHERE product_level = 1;
INSERT INTO products (id, code, name, description, price, cost, category, subcategory, enabled, rack_configurable, product_level, part_number, image_url, product_info_url) VALUES
('qtms', 'QTMS-1000', 'QTMS', 'The Qualitrol Transformer Monitoring System (QTMS) is a modular, multi-function system used to monitor critical parameters on power transformers.', 10000, 7000, 'monitoring-systems', 'QTMS', true, true, 1, 'QTMS-1000', 'https://qualitrolcorp.com/wp-content/uploads/2024/01/QTMS_Main_Image.png', 'https://qualitrolcorp.com/products/qualitrol-qtms-transformer-monitoring-system/'),
('dga', 'DGA-1000', 'DGA', 'Dissolved Gas Analysis (DGA) monitors provide continuous, online monitoring of key gases dissolved in transformer oil, enabling early detection of developing faults.', 8000, 5000, 'monitoring-systems', 'DGA', true, false, 1, 'DGA-1000', 'https://qualitrolcorp.com/wp-content/uploads/2024/01/DGA_Monitor.png', 'https://qualitrolcorp.com/products/dga-dissolved-gas-analysis/'),
('partial-discharge', 'PD-1000', 'Partial Discharge', 'Partial Discharge (PD) monitors detect and measure the presence of PD activity within transformers, providing valuable insights into insulation condition and potential defects.', 12000, 9000, 'monitoring-systems', 'PD', true, false, 1, 'PD-1000', 'https://qualitrolcorp.com/wp-content/uploads/2024/01/Partial_Discharge_Monitor.png', 'https://qualitrolcorp.com/products/partial-discharge-monitoring/');

-- 5. Clear and insert Level 2 products (chassis for QTMS)
DELETE FROM products WHERE product_level = 2;
INSERT INTO products (id, code, name, description, price, cost, category, subcategory, enabled, parent_product_id, product_level, part_number, specifications, product_info_url) VALUES
('ltx-chassis', 'LTX-6U-14S', 'LTX Chassis', 'Large capacity transformer monitoring system', 4200, 3000, 'chassis', 'LTX', true, 'qtms', 2, 'LTX-6U-14S', '{"height": "6U", "slots": 14}', 'https://www.qualitrolcorp.com/products/ltx-chassis'),
('mtx-chassis', 'MTX-3U-7S', 'MTX Chassis', 'Medium capacity transformer monitoring system', 2800, 2000, 'chassis', 'MTX', true, 'qtms', 2, 'MTX-3U-7S', '{"height": "3U", "slots": 7}', 'https://www.qualitrolcorp.com/products/mtx-chassis'),
('stx-chassis', 'STX-1.5U-4S', 'STX Chassis', 'Compact transformer monitoring system', 1900, 1400, 'chassis', 'STX', true, 'qtms', 2, 'STX-1.5U-4S', '{"height": "1.5U", "slots": 4}', 'https://www.qualitrolcorp.com/products/stx-chassis'),
('dga-9-plus', 'DGA9+-001', 'DGA 9 Plus', '9-gas online DGA monitor with advanced features', 15000, 11000, 'monitor', 'DGA9+', true, 'dga', 2, 'DGA9+-001', '{"gases": ["H2", "O2", "N2", "CO", "CO2", "CH4", "C2H2", "C2H4", "C2H6"], "oilType": "Mineral", "communication": ["Ethernet", "Modbus"]}', null),
('dga-5-pro', 'DGA5-PRO-001', 'DGA 5 Pro', '5-gas online DGA monitor for essential monitoring', 12000, 9000, 'monitor', 'DGA5', true, 'dga', 2, 'DGA5-PRO-001', '{"gases": ["H2", "CO", "CO2", "CH4", "C2H2"], "oilType": "Mineral", "communication": ["Ethernet"]}', null),
('pd-guard-pro', 'PD-G-PRO-001', 'PD-Guard Pro', 'Advanced online partial discharge monitoring system', 18000, 14000, 'monitor', 'PDG', true, 'partial-discharge', 2, 'PD-G-PRO-001', '{"sensors": 6, "frequencyRange": "300 kHz - 3 MHz", "communication": ["Fiber Optic", "Ethernet"]}', null),
('pd-sense-basic', 'PD-S-BASIC-001', 'PD-Sense Basic', 'Basic online partial discharge detection system', 15000, 11000, 'monitor', 'PDS', true, 'partial-discharge', 2, 'PD-S-BASIC-001', '{"sensors": 3, "frequencyRange": "500 kHz - 2 MHz", "communication": ["Ethernet"]}', null);

-- 6. Clear and insert Level 3 products (cards)
DELETE FROM products WHERE product_level = 3;
INSERT INTO products (id, code, name, description, price, cost, category, subcategory, enabled, parent_product_id, product_level, part_number, slot_requirement, specifications) VALUES
('relay-card-basic', 'RLY-8CH-001', 'Basic Relay Card', '8-channel relay output card', 850, 600, 'card', 'relay', true, 'ltx-chassis', 3, 'RLY-8CH-001', 1, '{"channels": 8, "voltage": "24VDC", "current": "2A per channel", "compatibleChassis": ["LTX", "MTX", "STX"]}'),
('analog-card-multi', 'ANA-16CH-001', 'Multi-Input Analog Card', 'High-precision analog input card', 1250, 900, 'card', 'analog', true, 'ltx-chassis', 3, 'ANA-16CH-001', 1, '{"channels": 16, "resolution": "16-bit", "inputRange": "±10V, 4-20mA", "inputs": 16, "compatibleChassis": ["LTX", "MTX", "STX"]}'),
('bushing-card', 'BSH-12CH-001', 'Bushing Monitoring Card', 'Transformer bushing monitoring interface', 2250, 1600, 'card', 'bushing', true, 'ltx-chassis', 3, 'BSH-12CH-001', 2, '{"channels": 12, "measurement": "Capacitance & Tan Delta", "compatibleChassis": ["LTX", "MTX", "STX"]}'),
('display-card', 'DIS-LCD-001', 'Local Display Interface', 'Local HMI display interface card', 950, 700, 'card', 'display', true, 'ltx-chassis', 3, 'DIS-LCD-001', 1, '{"display": "LCD", "resolution": "320x240", "backlight": "LED", "compatibleChassis": ["LTX"]}'),
('fiber-card-4', 'FIB-4I-001', 'Fiber Optic Communication Card (4 Inputs)', 'High-speed fiber optic interface with 4 inputs', 1850, 1300, 'card', 'fiber', true, 'ltx-chassis', 3, 'FIB-4I-001', 1, '{"ports": 2, "inputs": 4, "speed": "1Gbps", "connector": "LC", "compatibleChassis": ["LTX", "MTX", "STX"]}'),
('fiber-card-6', 'FIB-6I-001', 'Fiber Optic Communication Card (6 Inputs)', 'High-speed fiber optic interface with 6 inputs', 2150, 1500, 'card', 'fiber', true, 'ltx-chassis', 3, 'FIB-6I-001', 1, '{"ports": 2, "inputs": 6, "speed": "1Gbps", "connector": "LC", "compatibleChassis": ["LTX", "MTX", "STX"]}'),
('fiber-card-8', 'FIB-8I-001', 'Fiber Optic Communication Card (8 Inputs)', 'High-speed fiber optic interface with 8 inputs', 2450, 1700, 'card', 'fiber', true, 'ltx-chassis', 3, 'FIB-8I-001', 1, '{"ports": 2, "inputs": 8, "speed": "1Gbps", "connector": "LC", "compatibleChassis": ["LTX", "MTX", "STX"]}');

-- 7. Duplicate cards for MTX and STX chassis
INSERT INTO products (id, code, name, description, price, cost, category, subcategory, enabled, parent_product_id, product_level, part_number, slot_requirement, specifications)
SELECT 
  id || '-mtx' as id,
  code,
  name,
  description,
  price,
  cost,
  category,
  subcategory,
  enabled,
  'mtx-chassis' as parent_product_id,
  product_level,
  part_number,
  slot_requirement,
  specifications
FROM products 
WHERE parent_product_id = 'ltx-chassis' AND subcategory != 'display';

INSERT INTO products (id, code, name, description, price, cost, category, subcategory, enabled, parent_product_id, product_level, part_number, slot_requirement, specifications)
SELECT 
  id || '-stx' as id,
  code,
  name,
  description,
  price,
  cost,
  category,
  subcategory,
  enabled,
  'stx-chassis' as parent_product_id,
  product_level,
  part_number,
  slot_requirement,
  specifications
FROM products 
WHERE parent_product_id = 'ltx-chassis' AND subcategory != 'display';