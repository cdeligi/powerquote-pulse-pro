-- Fix RLS policies for quotes table to allow proper draft creation and management

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can manage their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes and shared quotes with edit p" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes and shared quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;

-- Create simplified, working RLS policies
CREATE POLICY "users_manage_own_quotes"
ON public.quotes
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_manage_all_quotes"
ON public.quotes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add default values to required fields to prevent insert errors
ALTER TABLE public.quotes 
ALTER COLUMN payment_terms SET DEFAULT 'Net 30',
ALTER COLUMN shipping_terms SET DEFAULT 'Ex-Works';