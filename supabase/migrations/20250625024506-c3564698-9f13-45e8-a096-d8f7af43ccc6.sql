
-- First, let's ensure we have proper tables for storing quote approval data
-- Update the quotes table to include all necessary fields for approval workflow
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
ADD COLUMN IF NOT EXISTS submitted_by_email TEXT,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS counter_offers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_discount NUMERIC DEFAULT 0;

-- Create a table for margin thresholds configuration
CREATE TABLE IF NOT EXISTS public.margin_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_name TEXT NOT NULL,
  minimum_margin_percent NUMERIC NOT NULL,
  warning_message TEXT,
  requires_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default margin thresholds
INSERT INTO public.margin_thresholds (threshold_name, minimum_margin_percent, warning_message, requires_approval)
VALUES 
  ('Low Margin Warning', 25.0, 'Warning: Requested discount will reduce margin below 25% threshold', true),
  ('Critical Margin Warning', 15.0, 'Critical: Margin below 15% requires executive approval', true),
  ('Minimum Acceptable Margin', 10.0, 'Minimum acceptable margin threshold', true)
ON CONFLICT DO NOTHING;

-- Enable RLS on margin_thresholds
ALTER TABLE public.margin_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policies for margin_thresholds (admin access only)
CREATE POLICY "Admins can view margin thresholds" ON public.margin_thresholds
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage margin thresholds" ON public.margin_thresholds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
