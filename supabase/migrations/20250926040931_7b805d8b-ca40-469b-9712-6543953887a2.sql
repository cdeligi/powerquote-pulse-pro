-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own counter" ON public.user_quote_counters;
DROP POLICY IF EXISTS "Users can update their own counter" ON public.user_quote_counters;
DROP POLICY IF EXISTS "Users can insert their own counter" ON public.user_quote_counters;
DROP POLICY IF EXISTS "Admins can manage all counters" ON public.user_quote_counters;

-- Drop table if it exists to start fresh
DROP TABLE IF EXISTS public.user_quote_counters CASCADE;

-- Create user_quote_counters table for tracking quote sequences per user
CREATE TABLE public.user_quote_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  current_counter INTEGER NOT NULL DEFAULT 1,
  last_finalized_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_quote_counters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own counter" 
ON public.user_quote_counters 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own counter" 
ON public.user_quote_counters 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own counter" 
ON public.user_quote_counters 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all counters" 
ON public.user_quote_counters 
FOR ALL 
USING (is_admin());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_quote_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_quote_counters_updated_at
  BEFORE UPDATE ON public.user_quote_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_quote_counters_updated_at();