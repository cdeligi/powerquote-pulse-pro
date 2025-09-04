-- First, create the new role enum
CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'ADMIN', 'FINANCE');

-- Create a function to check role that works with both old and new enum
CREATE OR REPLACE FUNCTION public.get_user_role_new(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN role = 'level1' THEN 'LEVEL_1'
    WHEN role = 'level2' THEN 'LEVEL_2' 
    WHEN role = 'admin' THEN 'ADMIN'
    ELSE 'LEVEL_1'
  END
  FROM public.profiles 
  WHERE id = user_id;
$$;

-- Create features table
CREATE TABLE IF NOT EXISTS public.features (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create role feature defaults table
CREATE TABLE IF NOT EXISTS public.role_feature_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  feature_key text NOT NULL REFERENCES public.features(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, feature_key)
);

-- Create user feature overrides table
CREATE TABLE IF NOT EXISTS public.user_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.features(key) ON DELETE CASCADE,
  allowed boolean, -- null means no override
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Create legal pages table
CREATE TABLE IF NOT EXISTS public.legal_pages (
  slug text PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS on new tables
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_feature_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for features
DROP POLICY IF EXISTS "Anyone can view features" ON public.features;
DROP POLICY IF EXISTS "Admins can manage features" ON public.features;

CREATE POLICY "Anyone can view features" ON public.features FOR SELECT USING (true);
CREATE POLICY "Admins can manage features" ON public.features FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
);

-- RLS policies for role_feature_defaults
DROP POLICY IF EXISTS "Anyone can view role defaults" ON public.role_feature_defaults;
DROP POLICY IF EXISTS "Admins can manage role defaults" ON public.role_feature_defaults;

CREATE POLICY "Anyone can view role defaults" ON public.role_feature_defaults FOR SELECT USING (true);
CREATE POLICY "Admins can manage role defaults" ON public.role_feature_defaults FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
);

-- RLS policies for user_feature_overrides
DROP POLICY IF EXISTS "Users can view own overrides" ON public.user_feature_overrides;
DROP POLICY IF EXISTS "Admins can manage all overrides" ON public.user_feature_overrides;

CREATE POLICY "Users can view own overrides" ON public.user_feature_overrides FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
);
CREATE POLICY "Admins can manage all overrides" ON public.user_feature_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
);

-- RLS policies for legal_pages
DROP POLICY IF EXISTS "Anyone can view legal pages" ON public.legal_pages;
DROP POLICY IF EXISTS "Admins can manage legal pages" ON public.legal_pages;

CREATE POLICY "Anyone can view legal pages" ON public.legal_pages FOR SELECT USING (true);
CREATE POLICY "Admins can manage legal pages" ON public.legal_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
);

-- Insert default features (only if they don't exist)
INSERT INTO public.features (key, label, description) 
SELECT * FROM (VALUES 
  ('FEATURE_BOM_SHOW_PRODUCT_COST', 'BOM → Show Product Cost', 'Show cost fields/columns in BOM builder'),
  ('FEATURE_BOM_FORCE_PART_NUMBER', 'BOM → Force Part Number', 'Expose Force Part Number control in BOM builder'),
  ('FEATURE_BOM_EDIT_PART_NUMBER', 'BOM → Edit Part Number', 'Edit part number in quote requests')
) AS new_features(key, label, description)
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE features.key = new_features.key);

-- Insert role defaults for each feature (only if they don't exist)
INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT * FROM (VALUES 
  -- FEATURE_BOM_SHOW_PRODUCT_COST: Default allowed for ADMIN, FINANCE, LEVEL_3
  ('ADMIN'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
  ('FINANCE'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
  ('LEVEL_3'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
  ('LEVEL_2'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', false),
  ('LEVEL_1'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', false),

  -- FEATURE_BOM_FORCE_PART_NUMBER: Default allowed for ADMIN, FINANCE, LEVEL_3, LEVEL_2
  ('ADMIN'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true),
  ('FINANCE'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true),
  ('LEVEL_3'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true),
  ('LEVEL_2'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true),
  ('LEVEL_1'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', false),

  -- FEATURE_BOM_EDIT_PART_NUMBER: Default allowed for ADMIN, FINANCE, LEVEL_3, LEVEL_2
  ('ADMIN'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true),
  ('FINANCE'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true),
  ('LEVEL_3'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true),
  ('LEVEL_2'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true),
  ('LEVEL_1'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', false)
) AS new_defaults(role, feature_key, allowed)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_feature_defaults 
  WHERE role_feature_defaults.role = new_defaults.role 
  AND role_feature_defaults.feature_key = new_defaults.feature_key
);

-- Insert default legal pages with boilerplate content (only if they don't exist)
INSERT INTO public.legal_pages (slug, content) 
SELECT * FROM (VALUES 
  ('terms', '# Terms of Service

## 1. Acceptance of Terms
By accessing and using PowerQuotePro, you agree to be bound by these Terms of Service and all applicable laws and regulations.

## 2. Authorized Use Only
This system is for authorized business use only. Unauthorized access is strictly prohibited.

## 3. User Responsibilities
- Maintain confidentiality of your account credentials
- Use the system only for legitimate business purposes
- Report any security concerns immediately

## 4. Monitoring and Logging
All activities on this system may be monitored and logged for security purposes.

## 5. Limitation of Liability
The company shall not be liable for any indirect, incidental, or consequential damages.

## 6. Modifications
These terms may be updated at any time. Continued use constitutes acceptance of modified terms.'),

  ('privacy', '# Privacy Policy

## 1. Information Collection
We collect information necessary for providing our quoting services, including:
- Contact information (name, email, phone)
- Company information
- Usage data and system logs

## 2. Use of Information
Your information is used to:
- Provide access to PowerQuotePro
- Process quote requests
- Maintain system security
- Improve our services

## 3. Information Sharing
We do not sell, trade, or rent your personal information to third parties.

## 4. Data Security
We implement appropriate security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.

## 5. Data Retention
We retain your information for as long as necessary to provide services and comply with legal obligations.

## 6. Your Rights
You have the right to:
- Access your personal information
- Request corrections to inaccurate data
- Request deletion of your data (subject to business requirements)

## 7. Contact Information
For privacy-related questions, contact your system administrator.')
) AS new_pages(slug, content)
WHERE NOT EXISTS (SELECT 1 FROM public.legal_pages WHERE legal_pages.slug = new_pages.slug);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_feature_overrides_updated_at ON public.user_feature_overrides;
CREATE TRIGGER update_user_feature_overrides_updated_at
  BEFORE UPDATE ON public.user_feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_pages_updated_at ON public.legal_pages;
CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();