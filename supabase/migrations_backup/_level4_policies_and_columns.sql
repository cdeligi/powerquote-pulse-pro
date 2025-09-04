-- Align Level 4 schema with app usage and add permissive RLS policies

-- 1) Ensure dropdown options have display_order used by the app
DO $$ BEGIN
  ALTER TABLE public.level4_dropdown_options
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN
  -- Table may not exist in some environments; ignore
  NULL;
END $$;

-- 2) Enable RLS on Level 4 tables
DO $$ BEGIN
  ALTER TABLE public.level4_configurations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.level4_configuration_fields ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.level4_dropdown_options ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 3) Create permissive policies for authenticated and anon (if you use anon key on client)
DO $$ BEGIN
  CREATE POLICY level4_configurations_all ON public.level4_configurations
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY level4_fields_all ON public.level4_configuration_fields
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY level4_options_all ON public.level4_dropdown_options
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END $$;
