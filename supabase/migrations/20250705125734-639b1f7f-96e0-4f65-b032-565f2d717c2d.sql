
-- Create quote_analytics table for dashboard analytics
CREATE TABLE IF NOT EXISTS public.quote_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  status text NOT NULL,
  quote_count integer NOT NULL DEFAULT 0,
  total_value numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on quote_analytics
ALTER TABLE public.quote_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for quote_analytics
CREATE POLICY "Authenticated users can view quote analytics" ON public.quote_analytics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quote analytics" ON public.quote_analytics
  FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'finance')
  ));

-- Create function to update quote analytics
CREATE OR REPLACE FUNCTION public.update_quote_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing analytics with proper WHERE clause
  DELETE FROM public.quote_analytics WHERE created_at < now();
  
  -- Insert updated analytics data
  INSERT INTO public.quote_analytics (month, status, quote_count, total_value, total_cost)
  SELECT 
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
    status,
    COUNT(*) as quote_count,
    COALESCE(SUM(original_quote_value), 0) as total_value,
    COALESCE(SUM(total_cost), 0) as total_cost
  FROM public.quotes
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
  GROUP BY DATE_TRUNC('month', created_at), status;
END;
$$;

-- Create function to calculate BOM costs properly
CREATE OR REPLACE FUNCTION public.calculate_bom_total_cost(quote_id_param text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_cost numeric := 0;
BEGIN
  SELECT COALESCE(SUM(unit_cost * quantity), 0) 
  INTO total_cost
  FROM public.bom_items 
  WHERE quote_id = quote_id_param;
  
  RETURN total_cost;
END;
$$;

-- Update quotes table to ensure proper cost calculation
CREATE OR REPLACE FUNCTION public.update_quote_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the quote's total cost when BOM items change
  UPDATE public.quotes 
  SET 
    total_cost = public.calculate_bom_total_cost(NEW.quote_id),
    updated_at = now()
  WHERE id = NEW.quote_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update quote costs when BOM items change
DROP TRIGGER IF EXISTS update_quote_costs_trigger ON public.bom_items;
CREATE TRIGGER update_quote_costs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bom_items
  FOR EACH ROW EXECUTE FUNCTION public.update_quote_costs();
