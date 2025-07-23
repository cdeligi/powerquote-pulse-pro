-- Phase 1: Add Asset Type Structure
CREATE TABLE IF NOT EXISTS public.asset_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert standard asset types
INSERT INTO public.asset_types (id, name, description) VALUES
('power-transformer', 'Power Transformer', 'Power transformer monitoring systems'),
('breakers', 'Breakers', 'Circuit breaker monitoring systems'),
('gas-insulated-switchgear', 'Gas Insulated Switchgear', 'GIS monitoring systems'),
('reactor', 'Reactor', 'Reactor monitoring systems'),
('capacitor-bank', 'Capacitor Bank', 'Capacitor bank monitoring systems')
ON CONFLICT (id) DO NOTHING;

-- Add asset_type_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS asset_type_id TEXT REFERENCES public.asset_types(id);

-- Update existing Level 1 products with proper asset type categorization
UPDATE public.products 
SET asset_type_id = 'power-transformer'
WHERE product_level = 1 AND subcategory IN ('QTMS', 'DGA', 'PD');

-- Enable RLS on asset_types
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for asset_types
CREATE POLICY "Anyone can view asset types" 
ON public.asset_types 
FOR SELECT 
USING (enabled = true);

CREATE POLICY "Admins can manage asset types" 
ON public.asset_types 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');