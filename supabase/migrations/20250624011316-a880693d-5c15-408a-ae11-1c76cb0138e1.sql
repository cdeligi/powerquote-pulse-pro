
-- Create table for storing submitted quotes with field data (if not exists)
CREATE TABLE IF NOT EXISTS public.quotes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  oracle_customer_id TEXT NOT NULL,
  sfdc_opportunity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'Medium',
  payment_terms TEXT NOT NULL,
  shipping_terms TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  original_quote_value NUMERIC NOT NULL,
  requested_discount NUMERIC NOT NULL,
  discounted_value NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  original_margin NUMERIC NOT NULL,
  discounted_margin NUMERIC NOT NULL,
  gross_profit NUMERIC NOT NULL,
  is_rep_involved BOOLEAN NOT NULL DEFAULT false,
  discount_justification TEXT,
  quote_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- Create table for storing BOM items related to quotes (if not exists)
CREATE TABLE IF NOT EXISTS public.bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  part_number TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  margin NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (only if not already enabled)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes (users can see their own quotes, admins can see all)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Users can view their own quotes') THEN
    CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT TO authenticated 
      USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'level2')));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Users can create their own quotes') THEN
    CREATE POLICY "Users can create their own quotes" ON public.quotes FOR INSERT TO authenticated 
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Admins can update quotes') THEN
    CREATE POLICY "Admins can update quotes" ON public.quotes FOR UPDATE TO authenticated 
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'level2')));
  END IF;
END $$;

-- RLS Policies for bom_items (follow quote access patterns)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bom_items' AND policyname = 'Users can view bom items for accessible quotes') THEN
    CREATE POLICY "Users can view bom items for accessible quotes" ON public.bom_items FOR SELECT TO authenticated 
      USING (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'level2')))));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bom_items' AND policyname = 'Users can create bom items for their quotes') THEN
    CREATE POLICY "Users can create bom items for their quotes" ON public.bom_items FOR INSERT TO authenticated 
      WITH CHECK (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND user_id = auth.uid()));
  END IF;
END $$;
