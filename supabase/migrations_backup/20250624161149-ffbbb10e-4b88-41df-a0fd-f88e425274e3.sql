
-- Check if RLS is enabled on quote_fields table and grant proper access
-- First, let's ensure the anon and authenticated roles can read quote fields
GRANT SELECT ON public.quote_fields TO anon;
GRANT SELECT ON public.quote_fields TO authenticated;

-- If RLS is enabled, create a policy to allow reading enabled quote fields
-- This will allow anyone to read quote fields that are enabled
DROP POLICY IF EXISTS "Anyone can view enabled quote fields" ON public.quote_fields;
CREATE POLICY "Anyone can view enabled quote fields" 
  ON public.quote_fields 
  FOR SELECT 
  USING (enabled = true);

-- Make sure RLS is enabled for security but allows the policy above
ALTER TABLE public.quote_fields ENABLE ROW LEVEL SECURITY;
