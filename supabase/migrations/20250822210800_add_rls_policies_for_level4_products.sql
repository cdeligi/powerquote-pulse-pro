-- Enable RLS on level4_products
ALTER TABLE public.level4_products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all level4_products
CREATE POLICY "Enable read access for all authenticated users"
ON public.level4_products
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own level4_products
CREATE POLICY "Enable insert for authenticated users only"
ON public.level4_products
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update level4_products they created
CREATE POLICY "Enable update for users based on creator_id"
ON public.level4_products
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Enable RLS on level3_level4_relationships
ALTER TABLE public.level3_level4_relationships ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Enable read access for all authenticated users on relationships"
ON public.level3_level4_relationships
FOR SELECT
TO authenticated
USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Enable insert for authenticated users on relationships"
ON public.level3_level4_relationships
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update for authenticated users
CREATE POLICY "Enable update for authenticated users on relationships"
ON public.level3_level4_relationships
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
