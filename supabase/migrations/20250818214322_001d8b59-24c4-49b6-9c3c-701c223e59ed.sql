-- Create table for Level 4 product configurations
CREATE TABLE public.level4_product_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level4_product_id TEXT NOT NULL,
  config_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.level4_product_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage level4 product configs" 
ON public.level4_product_configs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Authenticated users can view level4 product configs" 
ON public.level4_product_configs 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_level4_product_configs_updated_at
BEFORE UPDATE ON public.level4_product_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Alter level4_configuration_options to add new columns
ALTER TABLE public.level4_configuration_options 
ADD COLUMN part_number TEXT,
ADD COLUMN info_url TEXT,
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Create index for better performance
CREATE INDEX idx_level4_product_configs_product_id ON public.level4_product_configs(level4_product_id);
CREATE INDEX idx_level4_configuration_options_product_id ON public.level4_configuration_options(level4_product_id);