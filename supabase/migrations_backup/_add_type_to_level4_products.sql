-- First, drop and recreate the table with the correct schema
-- This is a more reliable approach than ALTER TABLE for this case

-- 1. Drop dependent objects first
DROP TRIGGER IF EXISTS trg_level4_products_updated_at ON public.level4_products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.level4_products;
DROP POLICY IF EXISTS "Enable all for admins" ON public.level4_products;

-- 2. Create a temporary table with the correct schema
CREATE TABLE public.level4_products_temp (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  parent_product_id text NOT NULL,
  description text,
  configuration_type text NOT NULL DEFAULT 'dropdown',
  type text,  -- The missing column
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  part_number text,
  CONSTRAINT fk_level4_parent_product FOREIGN KEY (parent_product_id) 
    REFERENCES public.products(id) ON DELETE CASCADE
);

-- 3. Copy data from old table to new table
INSERT INTO public.level4_products_temp
SELECT 
  id, name, parent_product_id, description, configuration_type, 
  NULL as type, -- Initialize type as NULL for existing records
  price, cost, options, enabled, created_at, updated_at, part_number
FROM public.level4_products;

-- 4. Drop the old table and rename the new one
DROP TABLE public.level4_products;
ALTER TABLE public.level4_products_temp RENAME TO level4_products;

-- 5. Recreate the triggers and policies
CREATE TRIGGER trg_level4_products_updated_at
BEFORE UPDATE ON public.level4_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recreate RLS policies
ALTER TABLE public.level4_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.level4_products
  FOR SELECT USING (true);

CREATE POLICY "Enable all for admins" ON public.level4_products
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Add comments
COMMENT ON COLUMN public.level4_products.type IS 'Type of the configuration (e.g., bushing, analog, etc.)';

-- Refresh the database schema cache
NOTIFY pgrst, 'reload schema';
