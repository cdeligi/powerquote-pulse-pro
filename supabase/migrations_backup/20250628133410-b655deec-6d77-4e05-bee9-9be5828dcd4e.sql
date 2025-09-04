
-- Create Level 4 products table
CREATE TABLE public.level4_products (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  parent_product_id text NOT NULL, -- Links to Level 3 product
  description text,
  configuration_type text NOT NULL DEFAULT 'dropdown', -- 'dropdown' or 'multiline'
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create Level 3 to Level 4 relationships table
CREATE TABLE public.level3_level4_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level3_product_id text NOT NULL,
  level4_product_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create Level 4 configuration options table (for dropdown values and multiline options)
CREATE TABLE public.level4_configuration_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level4_product_id text NOT NULL,
  option_key text NOT NULL, -- For dropdown: the value; For multiline: the field name
  option_value text NOT NULL, -- For dropdown: display name; For multiline: the description
  display_order integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.level4_products 
ADD CONSTRAINT fk_level4_parent_product 
FOREIGN KEY (parent_product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.level3_level4_relationships 
ADD CONSTRAINT fk_level3_relationship 
FOREIGN KEY (level3_product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.level3_level4_relationships 
ADD CONSTRAINT fk_level4_relationship 
FOREIGN KEY (level4_product_id) REFERENCES public.level4_products(id) ON DELETE CASCADE;

ALTER TABLE public.level4_configuration_options 
ADD CONSTRAINT fk_level4_options_product 
FOREIGN KEY (level4_product_id) REFERENCES public.level4_products(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_level4_products_parent ON public.level4_products(parent_product_id);
CREATE INDEX idx_level3_level4_relationships_level3 ON public.level3_level4_relationships(level3_product_id);
CREATE INDEX idx_level3_level4_relationships_level4 ON public.level3_level4_relationships(level4_product_id);
CREATE INDEX idx_level4_config_options_product ON public.level4_configuration_options(level4_product_id);
