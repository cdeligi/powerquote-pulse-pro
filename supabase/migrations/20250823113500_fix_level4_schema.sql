-- 1. Create the level4_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.level4_products (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  parent_product_id text NOT NULL,
  description text,
  configuration_type text NOT NULL DEFAULT 'dropdown',
  type text,
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_level4_parent_product FOREIGN KEY (parent_product_id) 
    REFERENCES public.products(id) ON DELETE CASCADE
);

-- 2. Create the level3_level4_relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.level3_level4_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level3_product_id text NOT NULL,
  level4_product_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_level3_relationship FOREIGN KEY (level3_product_id)
    REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT fk_level4_relationship FOREIGN KEY (level4_product_id)
    REFERENCES public.level4_products(id) ON DELETE CASCADE,
  CONSTRAINT uq_level3_level4 UNIQUE (level3_product_id, level4_product_id)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_level4_products_parent ON public.level4_products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_level3_level4_relationships_level3 ON public.level3_level4_relationships(level3_product_id);
CREATE INDEX IF NOT EXISTS idx_level3_level4_relationships_level4 ON public.level3_level4_relationships(level4_product_id);

-- 4. Enable RLS and set up policies
ALTER TABLE public.level4_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level3_level4_relationships ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.level4_products
  FOR SELECT USING (true);

CREATE POLICY "Enable all for admins" ON public.level4_products
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Enable read access for all users" ON public.level3_level4_relationships
  FOR SELECT USING (true);

CREATE POLICY "Enable all for admins on relationships" ON public.level3_level4_relationships
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- 6. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_level4_products_updated_at') THEN
    CREATE TRIGGER trg_level4_products_updated_at
    BEFORE UPDATE ON public.level4_products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_level3_level4_relationships_updated_at') THEN
    CREATE TRIGGER trg_level3_level4_relationships_updated_at
    BEFORE UPDATE ON public.level3_level4_relationships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
