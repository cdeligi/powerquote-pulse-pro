-- Create new role enum
DO $$ 
BEGIN
    CREATE TYPE public.user_role AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'ADMIN', 'FINANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Create policies for new tables only
DO $$
BEGIN
    -- Features policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'features' AND policyname = 'Anyone can view features') THEN
        CREATE POLICY "Anyone can view features" ON public.features FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'features' AND policyname = 'Admins can manage features') THEN
        CREATE POLICY "Admins can manage features" ON public.features FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
        );
    END IF;

    -- Role defaults policies  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_feature_defaults' AND policyname = 'Anyone can view role defaults') THEN
        CREATE POLICY "Anyone can view role defaults" ON public.role_feature_defaults FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_feature_defaults' AND policyname = 'Admins can manage role defaults') THEN
        CREATE POLICY "Admins can manage role defaults" ON public.role_feature_defaults FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
        );
    END IF;

    -- User overrides policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_feature_overrides' AND policyname = 'Users can view own overrides') THEN
        CREATE POLICY "Users can view own overrides" ON public.user_feature_overrides FOR SELECT USING (
          auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_feature_overrides' AND policyname = 'Admins can manage all overrides') THEN
        CREATE POLICY "Admins can manage all overrides" ON public.user_feature_overrides FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
        );
    END IF;

    -- Legal pages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'legal_pages' AND policyname = 'Anyone can view legal pages') THEN
        CREATE POLICY "Anyone can view legal pages" ON public.legal_pages FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'legal_pages' AND policyname = 'Admins can manage legal pages') THEN
        CREATE POLICY "Admins can manage legal pages" ON public.legal_pages FOR ALL USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN'))
        );
    END IF;
END $$;

-- Insert default features only if they don't exist
INSERT INTO public.features (key, label, description) 
SELECT 'FEATURE_BOM_SHOW_PRODUCT_COST', 'BOM → Show Product Cost', 'Show cost fields/columns in BOM builder'
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE key = 'FEATURE_BOM_SHOW_PRODUCT_COST');

INSERT INTO public.features (key, label, description) 
SELECT 'FEATURE_BOM_FORCE_PART_NUMBER', 'BOM → Force Part Number', 'Expose Force Part Number control in BOM builder'
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE key = 'FEATURE_BOM_FORCE_PART_NUMBER');

INSERT INTO public.features (key, label, description) 
SELECT 'FEATURE_BOM_EDIT_PART_NUMBER', 'BOM → Edit Part Number', 'Edit part number in quote requests'
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE key = 'FEATURE_BOM_EDIT_PART_NUMBER');

-- Insert role defaults only if they don't exist
INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'ADMIN'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'ADMIN' AND feature_key = 'FEATURE_BOM_SHOW_PRODUCT_COST');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'FINANCE'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'FINANCE' AND feature_key = 'FEATURE_BOM_SHOW_PRODUCT_COST');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'LEVEL_3'::public.user_role, 'FEATURE_BOM_SHOW_PRODUCT_COST', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'LEVEL_3' AND feature_key = 'FEATURE_BOM_SHOW_PRODUCT_COST');

-- Continue with other role defaults
INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'ADMIN'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'ADMIN' AND feature_key = 'FEATURE_BOM_FORCE_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'FINANCE'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'FINANCE' AND feature_key = 'FEATURE_BOM_FORCE_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'LEVEL_3'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'LEVEL_3' AND feature_key = 'FEATURE_BOM_FORCE_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'LEVEL_2'::public.user_role, 'FEATURE_BOM_FORCE_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'LEVEL_2' AND feature_key = 'FEATURE_BOM_FORCE_PART_NUMBER');

-- Edit part number permissions
INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'ADMIN'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'ADMIN' AND feature_key = 'FEATURE_BOM_EDIT_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'FINANCE'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'FINANCE' AND feature_key = 'FEATURE_BOM_EDIT_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'LEVEL_3'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'LEVEL_3' AND feature_key = 'FEATURE_BOM_EDIT_PART_NUMBER');

INSERT INTO public.role_feature_defaults (role, feature_key, allowed) 
SELECT 'LEVEL_2'::public.user_role, 'FEATURE_BOM_EDIT_PART_NUMBER', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_feature_defaults WHERE role = 'LEVEL_2' AND feature_key = 'FEATURE_BOM_EDIT_PART_NUMBER');

-- Insert default legal pages
INSERT INTO public.legal_pages (slug, content) 
SELECT 'terms', '# Terms of Service

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
These terms may be updated at any time. Continued use constitutes acceptance of modified terms.'
WHERE NOT EXISTS (SELECT 1 FROM public.legal_pages WHERE slug = 'terms');

INSERT INTO public.legal_pages (slug, content) 
SELECT 'privacy', '# Privacy Policy

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
For privacy-related questions, contact your system administrator.'
WHERE NOT EXISTS (SELECT 1 FROM public.legal_pages WHERE slug = 'privacy');