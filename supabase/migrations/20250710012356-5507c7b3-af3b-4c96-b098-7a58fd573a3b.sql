
-- Create chassis configurations table for visual chassis layouts
CREATE TABLE public.chassis_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level2_product_id text NOT NULL,
  layout_data jsonb NOT NULL DEFAULT '{}',
  slot_mappings jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Add RLS policies for chassis configurations
ALTER TABLE public.chassis_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chassis configurations" ON public.chassis_configurations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view chassis configurations" ON public.chassis_configurations
FOR SELECT USING (true);

-- Enhance quotes table with price override history and finance approval flag
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS price_override_history jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS requires_finance_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_submitted_at timestamp with time zone DEFAULT now();

-- Enhance user_sessions table with browser fingerprinting
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS browser_fingerprint text,
ADD COLUMN IF NOT EXISTS screen_resolution text,
ADD COLUMN IF NOT EXISTS timezone text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chassis_configurations_level2_product ON public.chassis_configurations(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_quotes_requires_finance_approval ON public.quotes(requires_finance_approval);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON public.user_sessions(user_id, is_active);

-- Add function to update chassis configuration timestamps
CREATE OR REPLACE FUNCTION public.update_chassis_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger for chassis configurations
DROP TRIGGER IF EXISTS update_chassis_configurations_updated_at ON public.chassis_configurations;
CREATE TRIGGER update_chassis_configurations_updated_at
  BEFORE UPDATE ON public.chassis_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chassis_config_updated_at();
