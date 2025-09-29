-- Add include_in_pdf checkbox field to quote_fields table
ALTER TABLE public.quote_fields 
ADD COLUMN IF NOT EXISTS include_in_pdf boolean DEFAULT false;

-- Add quote_expires_days setting for admin configuration
INSERT INTO public.app_settings (key, value, description) 
VALUES (
  'quote_expires_days', 
  '"30"'::jsonb, 
  'Number of days after which quotes expire'
) ON CONFLICT (key) DO NOTHING;

-- Add company_logo_url setting for PDF template
INSERT INTO public.app_settings (key, value, description) 
VALUES (
  'company_logo_url', 
  '""'::jsonb, 
  'URL of company logo for PDF templates'
) ON CONFLICT (key) DO NOTHING;

-- Add company_name setting for PDF template
INSERT INTO public.app_settings (key, value, description) 
VALUES (
  'company_name', 
  '"QUALITROL"'::jsonb, 
  'Company name for PDF templates'
) ON CONFLICT (key) DO NOTHING;