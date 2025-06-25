
-- Add missing standard products using INSERT ON CONFLICT to handle duplicates
INSERT INTO public.products (id, name, description, category, subcategory, price, cost, is_active) VALUES
('tm8', 'TM8 Monitoring System', 'TM8 transformer monitoring system', 'Monitoring', 'Standard', 15000.00, 9000.00, true),
('TM1', 'TM1 Single Point Monitor', 'TM1 single point monitoring device', 'Monitoring', 'Standard', 8000.00, 4800.00, true),
('calgas-bottle', 'Calibration Gas Bottle', 'Standard calibration gas bottle for DGA systems', 'Accessories', 'Calibration', 250.00, 150.00, true),
('moisture-sensor', 'Moisture Sensor', 'High precision moisture detection sensor', 'Sensors', 'Environmental', 1200.00, 720.00, true),
('QTMS_CONFIGURATION', 'QTMS Configuration', 'Dynamic QTMS system configuration', 'Systems', 'Configurable', 0.00, 0.00, true),
('DGA_CONFIGURATION', 'DGA Configuration', 'Dynamic DGA system configuration', 'Systems', 'Configurable', 0.00, 0.00, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  price = EXCLUDED.price,
  cost = EXCLUDED.cost,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Ensure all products have proper cost values
UPDATE public.products 
SET 
  cost = CASE 
    WHEN cost IS NULL OR cost = 0 THEN price * 0.6 
    ELSE cost 
  END,
  is_active = true,
  updated_at = now()
WHERE id IN ('tm8', 'TM1', 'calgas-bottle', 'moisture-sensor', 'QTMS_CONFIGURATION', 'DGA_CONFIGURATION');
