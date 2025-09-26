-- Add Terms & Conditions storage for quote PDFs
INSERT INTO public.legal_pages (slug, content, updated_by) 
VALUES ('quote_terms', '', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Update legal_pages table to ensure it has all required columns
ALTER TABLE public.legal_pages 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();