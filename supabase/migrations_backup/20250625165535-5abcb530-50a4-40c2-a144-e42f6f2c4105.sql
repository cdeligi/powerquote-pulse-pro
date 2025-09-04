
-- First, populate the products table with all Level 1, Level 2, and Level 3 products
-- This will resolve the foreign key constraint violation in bom_items

-- Insert Level 1 Products
INSERT INTO public.products (id, name, description, category, subcategory, price, cost, is_active) VALUES
('qtms', 'QTMS', 'The Qualitrol Transformer Monitoring System (QTMS) is a modular, multi-function system used to monitor critical parameters on power transformers.', 'Monitoring Systems', 'Monitoring Systems', 10000, 7000, true),
('dga', 'DGA', 'Dissolved Gas Analysis (DGA) monitors provide continuous, online monitoring of key gases dissolved in transformer oil, enabling early detection of developing faults.', 'DGA Monitors', 'DGA Monitors', 8000, 5000, true),
('partial-discharge', 'Partial Discharge', 'Partial Discharge (PD) monitors detect and measure the presence of PD activity within transformers, providing valuable insights into insulation condition and potential defects.', 'PD Monitors', 'PD Monitors', 12000, 9000, true);

-- Insert Level 2 Products (QTMS Chassis)
INSERT INTO public.products (id, name, description, category, subcategory, price, cost, is_active) VALUES
('ltx-chassis', 'LTX Chassis', 'Large capacity transformer monitoring system', 'QTMS', 'LTX', 4200, 3000, true),
('mtx-chassis', 'MTX Chassis', 'Medium capacity transformer monitoring system', 'QTMS', 'MTX', 2800, 2000, true),
('stx-chassis', 'STX Chassis', 'Compact transformer monitoring system', 'QTMS', 'STX', 1900, 1400, true),
('chassis-6-slot', '6-Slot Chassis', '6-slot expansion chassis for QTMS', 'QTMS', 'Chassis', 2000, 1500, true),
('chassis-12-slot', '12-Slot Chassis', '12-slot expansion chassis for QTMS', 'QTMS', 'Chassis', 3500, 2500, true),
('core-sensor-unit', 'Core Sensor Unit', 'The Core Sensor Unit is the central processing unit for the QTMS system.', 'QTMS', 'Sensor', 5000, 3500, true),
('dga-9-plus', 'DGA 9 Plus', '9-gas online DGA monitor with advanced features', 'DGA', 'Monitor', 15000, 11000, true),
('dga-5-pro', 'DGA 5 Pro', '5-gas online DGA monitor for essential monitoring', 'DGA', 'Monitor', 12000, 9000, true),
('pd-guard-pro', 'PD-Guard Pro', 'Advanced online partial discharge monitoring system', 'PD', 'Monitor', 18000, 14000, true),
('pd-sense-basic', 'PD-Sense Basic', 'Basic online partial discharge detection system', 'PD', 'Monitor', 15000, 11000, true);

-- Insert Level 3 Products (Cards and Components)
INSERT INTO public.products (id, name, description, category, subcategory, price, cost, is_active) VALUES
-- Basic Relay Cards
('relay-card-basic', 'Basic Relay Card', '8-channel relay output card', 'QTMS', 'relay', 850, 600, true),
('relay-card-basic-mtx', 'Basic Relay Card', '8-channel relay output card', 'QTMS', 'relay', 850, 600, true),
('relay-card-basic-stx', 'Basic Relay Card', '8-channel relay output card', 'QTMS', 'relay', 850, 600, true),
-- Analog Cards
('analog-card-multi-ltx', 'Multi-Input Analog Card', 'High-precision analog input card', 'QTMS', 'analog', 1250, 900, true),
('analog-card-multi-mtx', 'Multi-Input Analog Card', 'High-precision analog input card', 'QTMS', 'analog', 1250, 900, true),
('analog-card-multi-stx', 'Multi-Input Analog Card', 'High-precision analog input card', 'QTMS', 'analog', 1250, 900, true),
-- Bushing Cards
('bushing-card-ltx', 'Bushing Monitoring Card', 'Transformer bushing monitoring interface', 'QTMS', 'bushing', 2250, 1600, true),
('bushing-card-mtx', 'Bushing Monitoring Card', 'Transformer bushing monitoring interface', 'QTMS', 'bushing', 2250, 1600, true),
('bushing-card-stx', 'Bushing Monitoring Card', 'Transformer bushing monitoring interface', 'QTMS', 'bushing', 2250, 1600, true),
-- Display Cards
('display-card-ltx', 'Local Display Interface', 'Local HMI display interface card', 'QTMS', 'display', 950, 700, true),
-- Fiber Cards
('fiber-card-4-input-ltx', 'Fiber Optic Communication Card (4 Inputs)', 'High-speed fiber optic interface with 4 inputs', 'QTMS', 'fiber', 1850, 1300, true),
('fiber-card-6-input-ltx', 'Fiber Optic Communication Card (6 Inputs)', 'High-speed fiber optic interface with 6 inputs', 'QTMS', 'fiber', 2150, 1500, true),
('fiber-card-8-input-ltx', 'Fiber Optic Communication Card (8 Inputs)', 'High-speed fiber optic interface with 8 inputs', 'QTMS', 'fiber', 2450, 1700, true),
('fiber-card-4-input-mtx', 'Fiber Optic Communication Card (4 Inputs)', 'High-speed fiber optic interface with 4 inputs', 'QTMS', 'fiber', 1850, 1300, true),
('fiber-card-4-input-stx', 'Fiber Optic Communication Card (4 Inputs)', 'High-speed fiber optic interface with 4 inputs', 'QTMS', 'fiber', 1850, 1300, true),
-- Additional Level 3 products
('relay-card-8', '8-Channel Relay Card', '8-channel relay output card for QTMS', 'QTMS', 'Relay', 800, 600, true),
('analog-input-card-4', '4-Channel Analog Input Card', '4-channel analog input card for QTMS', 'QTMS', 'Analog', 700, 500, true),
('fiber-optic-module', 'Fiber Optic Communication Module', 'Fiber optic communication module for QTMS', 'QTMS', 'Fiber', 1200, 900, true),
('display-module-touchscreen', 'Touchscreen Display Module', 'Touchscreen display module for local QTMS interface', 'QTMS', 'Display', 1500, 1100, true),
('digital-input-card-16', '16-Channel Digital Input Card', '16-channel digital input card for QTMS', 'QTMS', 'Digital', 600, 400, true),
('iec61850-communication-module', 'IEC 61850 Communication Module', 'IEC 61850 communication module for QTMS', 'QTMS', 'Communication', 1800, 1300, true);

-- Populate relationship tables
-- Level 1 to Level 2 relationships
INSERT INTO public.level1_level2_relationships (level1_product_id, level2_product_id) VALUES
('qtms', 'ltx-chassis'),
('qtms', 'mtx-chassis'),
('qtms', 'stx-chassis'),
('qtms', 'chassis-6-slot'),
('qtms', 'chassis-12-slot'),
('qtms', 'core-sensor-unit'),
('dga', 'dga-9-plus'),
('dga', 'dga-5-pro'),
('partial-discharge', 'pd-guard-pro'),
('partial-discharge', 'pd-sense-basic');

-- Level 2 to Level 3 relationships
INSERT INTO public.level2_level3_relationships (level2_product_id, level3_product_id) VALUES
-- LTX Chassis cards
('ltx-chassis', 'relay-card-basic'),
('ltx-chassis', 'analog-card-multi-ltx'),
('ltx-chassis', 'bushing-card-ltx'),
('ltx-chassis', 'display-card-ltx'),
('ltx-chassis', 'fiber-card-4-input-ltx'),
('ltx-chassis', 'fiber-card-6-input-ltx'),
('ltx-chassis', 'fiber-card-8-input-ltx'),
-- MTX Chassis cards
('mtx-chassis', 'relay-card-basic-mtx'),
('mtx-chassis', 'analog-card-multi-mtx'),
('mtx-chassis', 'bushing-card-mtx'),
('mtx-chassis', 'fiber-card-4-input-mtx'),
-- STX Chassis cards
('stx-chassis', 'relay-card-basic-stx'),
('stx-chassis', 'analog-card-multi-stx'),
('stx-chassis', 'bushing-card-stx'),
('stx-chassis', 'fiber-card-4-input-stx'),
-- 6-slot chassis cards
('chassis-6-slot', 'relay-card-8'),
('chassis-6-slot', 'analog-input-card-4'),
('chassis-6-slot', 'fiber-optic-module'),
('chassis-6-slot', 'display-module-touchscreen'),
('chassis-6-slot', 'digital-input-card-16'),
('chassis-6-slot', 'iec61850-communication-module');
