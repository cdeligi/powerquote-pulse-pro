-- Create Level 4 dynamic configuration tables expected by the app

-- 1) Parent configuration per Level 3 product
CREATE TABLE IF NOT EXISTS public.level4_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level3_product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_level4_configurations_level3_unique
  ON public.level4_configurations(level3_product_id);

-- 2) Fields belonging to a configuration
CREATE TABLE IF NOT EXISTS public.level4_configuration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level4_configuration_id uuid NOT NULL REFERENCES public.level4_configurations(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('dropdown')),
  info_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_level4_fields_config_order
  ON public.level4_configuration_fields(level4_configuration_id, display_order);

-- 3) Dropdown options per field
CREATE TABLE IF NOT EXISTS public.level4_dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level4_configuration_field_id uuid NOT NULL REFERENCES public.level4_configuration_fields(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_level4_options_field_order
  ON public.level4_dropdown_options(level4_configuration_field_id, display_order);

-- Updated at trigger to auto-maintain timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_level4_configurations_set_updated
  BEFORE UPDATE ON public.level4_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_level4_fields_set_updated
  BEFORE UPDATE ON public.level4_configuration_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_level4_options_set_updated
  BEFORE UPDATE ON public.level4_dropdown_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable RLS and add permissive policies for authenticated users
ALTER TABLE public.level4_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level4_configuration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level4_dropdown_options ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users full access
DO $$ BEGIN
  CREATE POLICY level4_configurations_auth_all ON public.level4_configurations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY level4_fields_auth_all ON public.level4_configuration_fields
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY level4_options_auth_all ON public.level4_dropdown_options
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
