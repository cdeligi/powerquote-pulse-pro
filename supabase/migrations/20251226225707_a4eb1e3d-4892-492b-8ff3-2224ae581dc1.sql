-- Add partner commission fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS partner_commission_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS partner_commission_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS partner_commission_value NUMERIC DEFAULT 0;

-- Add check constraint for commission type
ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_partner_commission_type_check 
CHECK (partner_commission_type IS NULL OR partner_commission_type IN ('discount', 'commission'));

-- Add feature key for partner commission visibility
INSERT INTO public.features (key, label, description)
VALUES ('FEATURE_BOM_SHOW_PARTNER_COMMISSION', 'View Partner Commission', 'Allow viewing partner commission costs in BOM and quotes')
ON CONFLICT (key) DO NOTHING;

-- Add role defaults for the new feature using correct enum values
INSERT INTO public.role_feature_defaults (role, feature_key, allowed)
VALUES 
  ('LEVEL_1', 'FEATURE_BOM_SHOW_PARTNER_COMMISSION', false),
  ('LEVEL_2', 'FEATURE_BOM_SHOW_PARTNER_COMMISSION', false),
  ('LEVEL_3', 'FEATURE_BOM_SHOW_PARTNER_COMMISSION', true),
  ('ADMIN', 'FEATURE_BOM_SHOW_PARTNER_COMMISSION', true),
  ('FINANCE', 'FEATURE_BOM_SHOW_PARTNER_COMMISSION', true)
ON CONFLICT DO NOTHING;