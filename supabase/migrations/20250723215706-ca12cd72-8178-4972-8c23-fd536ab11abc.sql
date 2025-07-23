-- Phase 1: Add Asset Type Structure and Fix Product Hierarchy

-- Create asset_types table for Level 1 categorization
CREATE TABLE IF NOT EXISTS public.asset_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert standard asset types
INSERT INTO public.asset_types (id, name, description, display_order) VALUES
('power-transformer', 'Power Transformer', 'Power transformer monitoring systems', 1),
('breakers', 'Breakers', 'Circuit breaker monitoring systems', 2),
('gas-insulated-switchgear', 'Gas Insulated Switchgear', 'GIS monitoring systems', 3),
('reactor', 'Reactor', 'Reactor monitoring systems', 4),
('capacitor-bank', 'Capacitor Bank', 'Capacitor bank monitoring systems', 5)
ON CONFLICT (id) DO NOTHING;

-- Add asset_type_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS asset_type_id TEXT REFERENCES public.asset_types(id);

-- Update existing Level 1 products with proper asset type categorization
UPDATE public.products 
SET asset_type_id = 'power-transformer'
WHERE product_level = 1 AND subcategory IN ('QTMS', 'DGA', 'PD');

-- Create optimized indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_level_enabled_asset ON products (product_level, enabled, asset_type_id);
CREATE INDEX IF NOT EXISTS idx_products_category_subcategory_enabled ON products (category, subcategory, enabled);
CREATE INDEX IF NOT EXISTS idx_products_parent_enabled ON products (parent_product_id, enabled);

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