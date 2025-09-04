-- Level 4 Configuration System Migration
-- Remodel Level 4 to support Option 1 (variable inputs) and Option 2 (fixed inputs)

-- First, clean up existing Level 4 tables if they exist and rebuild
DROP TABLE IF EXISTS public.bom_level4_values CASCADE;
DROP TABLE IF EXISTS public.level4_dropdown_options CASCADE;
DROP TABLE IF EXISTS public.level4_configuration_fields CASCADE;
DROP TABLE IF EXISTS public.level4_shared_options CASCADE;
DROP TABLE IF EXISTS public.level4_configurations CASCADE;

-- Create the new Level 4 configurations table with JSONB options
CREATE TABLE public.level4_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE, -- REFERENCES public.products(id) ON DELETE CASCADE, -- FK can be added if products table exists
  field_label text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('fixed', 'variable')),
  fixed_number_of_inputs integer, -- nullable, used when mode='fixed'
  variable_max_inputs integer,    -- nullable, used when mode='variable'
  options jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of {id, name, url}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure template constraints
  CONSTRAINT level4_template_constraints CHECK (
    (mode = 'variable' AND variable_max_inputs IS NOT NULL AND fixed_number_of_inputs IS NULL) OR
    (mode = 'fixed' AND fixed_number_of_inputs IS NOT NULL AND variable_max_inputs IS NULL)
  )
);

-- Create BOM Level 4 values table to store user selections
CREATE TABLE public.bom_level4_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_item_id uuid NOT NULL UNIQUE REFERENCES public.bom_items(id) ON DELETE CASCADE,
  level4_config_id uuid NOT NULL REFERENCES public.level4_configs(id) ON DELETE CASCADE,
  entries jsonb NOT NULL, -- Array of { index: number, value: string }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_level4_configs_product_id ON public.level4_configs(product_id);
CREATE INDEX idx_bom_l4_values_bom_item ON public.bom_level4_values(bom_item_id);
CREATE INDEX idx_bom_l4_values_config ON public.bom_level4_values(level4_config_id);

-- Add updated_at trigger for level4_configs
CREATE TRIGGER update_level4_configs_updated_at
  BEFORE UPDATE ON public.level4_configs
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

-- Level 4 configs - read for authenticated, write for admins
ALTER TABLE public.level4_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "level4_configs_read" ON public.level4_configs
  FOR SELECT USING (true);

CREATE POLICY "level4_configs_write" ON public.level4_configs
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