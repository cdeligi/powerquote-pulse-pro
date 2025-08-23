-- Level 4 Configuration System Migration
-- Remodel Level 4 to support Option 1 (variable inputs) and Option 2 (fixed inputs)

-- First, clean up existing Level 4 tables if they exist and rebuild
DROP TABLE IF EXISTS public.bom_level4_values CASCADE;
DROP TABLE IF EXISTS public.level4_dropdown_options CASCADE;
DROP TABLE IF EXISTS public.level4_configuration_fields CASCADE;
DROP TABLE IF EXISTS public.level4_shared_options CASCADE;
DROP TABLE IF EXISTS public.level4_configurations CASCADE;

-- Create the main Level 4 configurations table
CREATE TABLE public.level4_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level3_product_id text NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('OPTION_1', 'OPTION_2')),
  field_label text NOT NULL,
  info_url text,
  max_inputs integer CHECK (max_inputs IS NULL OR max_inputs >= 1),
  fixed_inputs integer CHECK (fixed_inputs IS NULL OR fixed_inputs >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure template constraints
  CONSTRAINT level4_template_constraints CHECK (
    (template_type = 'OPTION_1' AND max_inputs IS NOT NULL AND fixed_inputs IS NULL) OR
    (template_type = 'OPTION_2' AND fixed_inputs IS NOT NULL AND max_inputs IS NULL)
  )
);

-- Create dropdown options for Level 4 configurations
CREATE TABLE public.level4_dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level4_configuration_id uuid NOT NULL REFERENCES public.level4_configurations(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create BOM Level 4 values table to store user selections
CREATE TABLE public.bom_level4_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_item_id uuid NOT NULL REFERENCES public.bom_items(id) ON DELETE CASCADE,
  level4_configuration_id uuid NOT NULL REFERENCES public.level4_configurations(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('OPTION_1', 'OPTION_2')),
  entries jsonb NOT NULL, -- Array of { index: number, value: string }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_level4_configs_level3_product ON public.level4_configurations(level3_product_id);
CREATE INDEX idx_level4_options_config_order ON public.level4_dropdown_options(level4_configuration_id, display_order);
CREATE INDEX idx_bom_l4_values_bom_item ON public.bom_level4_values(bom_item_id);
CREATE INDEX idx_bom_l4_values_config ON public.bom_level4_values(level4_configuration_id);

-- Add updated_at trigger for level4_configurations
CREATE TRIGGER update_level4_configurations_updated_at
  BEFORE UPDATE ON public.level4_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add updated_at trigger for level4_dropdown_options
CREATE TRIGGER update_level4_dropdown_options_updated_at
  BEFORE UPDATE ON public.level4_dropdown_options
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add updated_at trigger for bom_level4_values
CREATE TRIGGER update_bom_level4_values_updated_at
  BEFORE UPDATE ON public.bom_level4_values
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add hasLevel4 column to products table if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_level4 boolean NOT NULL DEFAULT false;

-- Create index for has_level4 for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_has_level4 ON public.products(has_level4) WHERE has_level4 = true;

-- RLS Policies

-- Level 4 configurations - read for authenticated, write for admins
ALTER TABLE public.level4_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "level4_configurations_read" ON public.level4_configurations
  FOR SELECT USING (true);

CREATE POLICY "level4_configurations_write" ON public.level4_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director')
    )
  );

-- Level 4 dropdown options - read for authenticated, write for admins
ALTER TABLE public.level4_dropdown_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "level4_dropdown_options_read" ON public.level4_dropdown_options
  FOR SELECT USING (true);

CREATE POLICY "level4_dropdown_options_write" ON public.level4_dropdown_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director')
    )
  );

-- BOM Level 4 values - same access as BOM items
ALTER TABLE public.bom_level4_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_level4_values_access" ON public.bom_level4_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bom_items bi
      JOIN public.quotes q ON bi.quote_id = q.id
      WHERE bi.id = bom_level4_values.bom_item_id
      AND (
        q.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.role IN ('admin', 'director', 'level2')
        )
      )
    )
  );

-- Function to ensure only one default option per configuration
CREATE OR REPLACE FUNCTION public.ensure_single_default_level4_option()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this option as default, unset all other defaults for this configuration
  IF NEW.is_default = true THEN
    UPDATE public.level4_dropdown_options 
    SET is_default = false 
    WHERE level4_configuration_id = NEW.level4_configuration_id 
    AND id != COALESCE(NEW.id, gen_random_uuid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_level4_option_trigger
  BEFORE INSERT OR UPDATE ON public.level4_dropdown_options
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_level4_option();