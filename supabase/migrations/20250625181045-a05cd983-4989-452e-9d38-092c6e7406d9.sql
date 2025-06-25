
-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    -- Drop quote_fields policies if they exist
    DROP POLICY IF EXISTS "Anyone can view enabled quote fields" ON public.quote_fields;
    DROP POLICY IF EXISTS "Admins can manage quote fields" ON public.quote_fields;
    
    -- Drop quotes policies if they exist
    DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Admins can update all quotes" ON public.quotes;
    
    -- Drop bom_items policies if they exist
    DROP POLICY IF EXISTS "Users can view their quote BOM items" ON public.bom_items;
    DROP POLICY IF EXISTS "Users can insert their quote BOM items" ON public.bom_items;
    DROP POLICY IF EXISTS "Admins can view all BOM items" ON public.bom_items;
    DROP POLICY IF EXISTS "Admins can update all BOM items" ON public.bom_items;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS on tables
ALTER TABLE public.quote_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

-- Create quote_fields policies
CREATE POLICY "Anyone can view enabled quote fields" 
ON public.quote_fields 
FOR SELECT 
USING (enabled = true);

CREATE POLICY "Admins can manage quote fields" 
ON public.quote_fields 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create quotes policies
CREATE POLICY "Users can view their own quotes" 
ON public.quotes 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own quotes" 
ON public.quotes 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all quotes" 
ON public.quotes 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all quotes" 
ON public.quotes 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create bom_items policies
CREATE POLICY "Users can view their quote BOM items" 
ON public.bom_items 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE id = quote_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their quote BOM items" 
ON public.bom_items 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE id = quote_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all BOM items" 
ON public.bom_items 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all BOM items" 
ON public.bom_items 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Clean up duplicate quote fields
DELETE FROM public.quote_fields 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY label ORDER BY created_at) as rn
    FROM public.quote_fields
  ) t 
  WHERE t.rn > 1
);

-- Add price history tracking columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS original_prices jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_prices jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS price_adjustments jsonb DEFAULT '[]'::jsonb;

-- Add price history tracking columns to bom_items table
ALTER TABLE public.bom_items 
ADD COLUMN IF NOT EXISTS original_unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_adjustment_history jsonb DEFAULT '[]'::jsonb;

-- Update existing bom_items to set original_unit_price
UPDATE public.bom_items 
SET original_unit_price = unit_price 
WHERE original_unit_price = 0;
