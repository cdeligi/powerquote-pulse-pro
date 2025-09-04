
-- Drop existing restrictive policies that are causing issues
DROP POLICY IF EXISTS "Admin users can insert quote fields" ON public.quote_fields;
DROP POLICY IF EXISTS "Admin users can update quote fields" ON public.quote_fields;
DROP POLICY IF EXISTS "Admin users can delete quote fields" ON public.quote_fields;
DROP POLICY IF EXISTS "Anyone can view enabled quote fields" ON public.quote_fields;

-- Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Allow anyone to read enabled quote fields (needed for BOM builder)
CREATE POLICY "Anyone can view enabled quote fields" 
  ON public.quote_fields 
  FOR SELECT 
  USING (enabled = true);

-- Allow authenticated users to read all quote fields (needed for admin panel)
CREATE POLICY "Authenticated users can view all quote fields" 
  ON public.quote_fields 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow admin users to insert quote fields
CREATE POLICY "Admin users can insert quote fields" 
  ON public.quote_fields 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- Allow admin users to update quote fields
CREATE POLICY "Admin users can update quote fields" 
  ON public.quote_fields 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin_user());

-- Allow admin users to delete quote fields
CREATE POLICY "Admin users can delete quote fields" 
  ON public.quote_fields 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin_user());
