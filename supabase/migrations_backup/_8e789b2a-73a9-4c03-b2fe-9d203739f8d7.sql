-- Create new role enum with 5 roles
CREATE TYPE public.user_role AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'ADMIN', 'FINANCE');

-- Update profiles table to use new role enum
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new role column temporarily
ALTER TABLE public.profiles ADD COLUMN new_role public.user_role DEFAULT 'LEVEL_1';

-- Migrate existing roles
UPDATE public.profiles SET new_role = CASE
  WHEN role = 'level1' THEN 'LEVEL_1'::public.user_role
  WHEN role = 'level2' THEN 'LEVEL_2'::public.user_role
  WHEN role = 'admin' THEN 'ADMIN'::public.user_role
  ELSE 'LEVEL_1'::public.user_role
END;

-- Drop old role column and rename new one
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN new_role TO role;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- Create features table
CREATE TABLE public.features (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create role feature defaults table
CREATE TABLE public.role_feature_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  feature_key text NOT NULL REFERENCES public.features(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, feature_key)
);

-- Create user feature overrides table
CREATE TABLE public.user_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.features(key) ON DELETE CASCADE,
  allowed boolean, -- null means no override
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Create legal pages table
CREATE TABLE public.legal_pages (
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
CREATE POLICY "Anyone can view features" ON public.features FOR SELECT USING (true);
CREATE POLICY "Admins can manage features" ON public.features FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- RLS policies for role_feature_defaults
CREATE POLICY "Anyone can view role defaults" ON public.role_feature_defaults FOR SELECT USING (true);
CREATE POLICY "Admins can manage role defaults" ON public.role_feature_defaults FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- RLS policies for user_feature_overrides
CREATE POLICY "Users can view own overrides" ON public.user_feature_overrides FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins can manage all overrides" ON public.user_feature_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- RLS policies for legal_pages
CREATE POLICY "Anyone can view legal pages" ON public.legal_pages FOR SELECT USING (true);
CREATE POLICY "Admins can manage legal pages" ON public.legal_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Insert default features
INSERT INTO public.features (key, label, description) VALUES
('FEATURE_BOM_SHOW_PRODUCT_COST', 'BOM → Show Product Cost', 'Show cost fields/columns in BOM builder'),
('FEATURE_BOM_FORCE_PART_NUMBER', 'BOM → Force Part Number', 'Expose Force Part Number control in BOM builder'),
('FEATURE_BOM_EDIT_PART_NUMBER', 'BOM → Edit Part Number', 'Edit part number in quote requests');

-- Insert role defaults for each feature
INSERT INTO public.role_feature_defaults (role, feature_key, allowed) VALUES
-- FEATURE_BOM_SHOW_PRODUCT_COST: Default allowed for ADMIN, FINANCE, LEVEL_3
('ADMIN', 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
('FINANCE', 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
('LEVEL_3', 'FEATURE_BOM_SHOW_PRODUCT_COST', true),
('LEVEL_2', 'FEATURE_BOM_SHOW_PRODUCT_COST', false),
('LEVEL_1', 'FEATURE_BOM_SHOW_PRODUCT_COST', false),

-- FEATURE_BOM_FORCE_PART_NUMBER: Default allowed for ADMIN, FINANCE, LEVEL_3, LEVEL_2
('ADMIN', 'FEATURE_BOM_FORCE_PART_NUMBER', true),
('FINANCE', 'FEATURE_BOM_FORCE_PART_NUMBER', true),
('LEVEL_3', 'FEATURE_BOM_FORCE_PART_NUMBER', true),
('LEVEL_2', 'FEATURE_BOM_FORCE_PART_NUMBER', true),
('LEVEL_1', 'FEATURE_BOM_FORCE_PART_NUMBER', false),

-- FEATURE_BOM_EDIT_PART_NUMBER: Default allowed for ADMIN, FINANCE, LEVEL_3, LEVEL_2
('ADMIN', 'FEATURE_BOM_EDIT_PART_NUMBER', true),
('FINANCE', 'FEATURE_BOM_EDIT_PART_NUMBER', true),
('LEVEL_3', 'FEATURE_BOM_EDIT_PART_NUMBER', true),
('LEVEL_2', 'FEATURE_BOM_EDIT_PART_NUMBER', true),
('LEVEL_1', 'FEATURE_BOM_EDIT_PART_NUMBER', false);

-- Insert default legal pages with boilerplate content
INSERT INTO public.legal_pages (slug, content) VALUES
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
For privacy-related questions, contact your system administrator.');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feature_overrides_updated_at
  BEFORE UPDATE ON public.user_feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();