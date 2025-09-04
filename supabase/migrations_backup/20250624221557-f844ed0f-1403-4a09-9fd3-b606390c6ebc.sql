
-- Add RLS policies for admin users to manage quote fields
CREATE POLICY "Admin users can insert quote fields" 
  ON public.quote_fields 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update quote fields" 
  ON public.quote_fields 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete quote fields" 
  ON public.quote_fields 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add some default quote fields if the table is empty
INSERT INTO public.quote_fields (id, label, type, required, enabled, display_order)
SELECT 'customer-name', 'Customer Name', 'text', true, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'customer-name');

INSERT INTO public.quote_fields (id, label, type, required, enabled, display_order)
SELECT 'oracle-customer-id', 'Oracle Customer ID', 'text', true, true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'oracle-customer-id');

INSERT INTO public.quote_fields (id, label, type, required, enabled, display_order)
SELECT 'sfdc-opportunity', 'SFDC Opportunity ID', 'text', true, true, 3
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'sfdc-opportunity');

INSERT INTO public.quote_fields (id, label, type, required, enabled, options, display_order)
SELECT 'priority', 'Priority', 'select', true, true, '["High", "Medium", "Low", "Urgent"]'::jsonb, 4
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'priority');

INSERT INTO public.quote_fields (id, label, type, required, enabled, display_order)
SELECT 'shipping-terms', 'Shipping Terms', 'text', false, true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'shipping-terms');

INSERT INTO public.quote_fields (id, label, type, required, enabled, display_order)
SELECT 'payment-terms', 'Payment Terms', 'text', false, true, 6
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'payment-terms');

INSERT INTO public.quote_fields (id, label, type, required, enabled, options, display_order)
SELECT 'quote-currency', 'Quote Currency', 'select', true, true, '["USD", "EURO", "GBP", "CAD"]'::jsonb, 7
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'quote-currency');

INSERT INTO public.quote_fields (id, label, type, required, enabled, options, display_order)
SELECT 'is-rep-involved', 'Rep Involved', 'select', false, true, '["Yes", "No"]'::jsonb, 8
WHERE NOT EXISTS (SELECT 1 FROM public.quote_fields WHERE id = 'is-rep-involved');
