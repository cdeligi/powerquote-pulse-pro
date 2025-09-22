-- Create quote sharing functionality
CREATE TABLE IF NOT EXISTS public.quote_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(quote_id, shared_with)
);

-- Enable RLS on quote_shares
ALTER TABLE public.quote_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for quote sharing
CREATE POLICY "Users can create shares for their own quotes" 
ON public.quote_shares 
FOR INSERT 
WITH CHECK (
  shared_by = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_shares.quote_id 
    AND q.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view shares they created or received" 
ON public.quote_shares 
FOR SELECT 
USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY "Users can delete shares they created" 
ON public.quote_shares 
FOR DELETE 
USING (shared_by = auth.uid());

-- Add foreign key reference to quotes table
ALTER TABLE public.quote_shares 
ADD CONSTRAINT quote_shares_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES public.quotes(id) 
ON DELETE CASCADE;

-- Drop existing quote policies that we need to replace
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;

-- Create enhanced quote access policies to include shared quotes
CREATE POLICY "Users can view their own quotes and shared quotes" 
ON public.quotes 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM quote_shares qs 
    WHERE qs.quote_id = quotes.id 
    AND qs.shared_with = auth.uid() 
    AND (qs.expires_at IS NULL OR qs.expires_at > now())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow shared users to edit quotes if they have edit permission
CREATE POLICY "Users can update their own quotes and shared quotes with edit permission" 
ON public.quotes 
FOR UPDATE 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM quote_shares qs 
    WHERE qs.quote_id = quotes.id 
    AND qs.shared_with = auth.uid() 
    AND qs.permission_level = 'edit'
    AND (qs.expires_at IS NULL OR qs.expires_at > now())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);