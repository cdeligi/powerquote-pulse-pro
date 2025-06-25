
-- Create junction tables for many-to-many relationships between product levels
CREATE TABLE public.level1_level2_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level1_product_id TEXT NOT NULL,
  level2_product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(level1_product_id, level2_product_id)
);

CREATE TABLE public.level2_level3_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level2_product_id TEXT NOT NULL,
  level3_product_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(level2_product_id, level3_product_id)
);

-- Add margin configuration settings to app_settings
INSERT INTO public.app_settings (key, value, description) VALUES 
('margin_thresholds', '{"low": 15, "medium": 25, "high": 35}', 'Margin threshold percentages for quote approval warnings'),
('approval_requirements', '{"auto_approve_above": 25, "requires_review_below": 15}', 'Automatic approval and review requirements based on margin'),
('quote_approval_settings', '{"max_discount_without_approval": 10, "urgent_priority_auto_escalate": true}', 'Quote approval workflow settings')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Add counter offer tracking to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS counter_offers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_discount NUMERIC DEFAULT 0;

-- Update quotes table to include more detailed tracking
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS submitted_by_email TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_level1_level2_level1 ON public.level1_level2_relationships(level1_product_id);
CREATE INDEX IF NOT EXISTS idx_level1_level2_level2 ON public.level1_level2_relationships(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_level2_level3_level2 ON public.level2_level3_relationships(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_level2_level3_level3 ON public.level2_level3_relationships(level3_product_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_quote_id ON public.bom_items(quote_id);
