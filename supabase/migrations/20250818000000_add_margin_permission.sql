-- Add new feature for margin visibility
INSERT INTO features (key, label, description) 
VALUES ('FEATURE_BOM_SHOW_MARGIN', 'View Product Margins', 'Allows users to view margin percentages in BOM items')
ON CONFLICT (key) DO NOTHING;

-- Set default permissions for each role
INSERT INTO role_feature_defaults (role, feature_key, allowed)
VALUES 
  ('ADMIN', 'FEATURE_BOM_SHOW_MARGIN', true),
  ('FINANCE', 'FEATURE_BOM_SHOW_MARGIN', true),
  ('LEVEL_3', 'FEATURE_BOM_SHOW_MARGIN', true),
  ('LEVEL_2', 'FEATURE_BOM_SHOW_MARGIN', false),
  ('LEVEL_1', 'FEATURE_BOM_SHOW_MARGIN', false)
ON CONFLICT (role, feature_key) DO UPDATE 
SET allowed = EXCLUDED.allowed;
