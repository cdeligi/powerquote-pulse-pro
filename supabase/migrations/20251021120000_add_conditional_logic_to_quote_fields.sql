-- Add conditional logic configuration for quote fields
ALTER TABLE public.quote_fields
ADD COLUMN IF NOT EXISTS conditional_logic jsonb;

-- Ensure existing rows have an empty array by default
UPDATE public.quote_fields
SET conditional_logic = '[]'::jsonb
WHERE conditional_logic IS NULL;

COMMENT ON COLUMN public.quote_fields.conditional_logic IS 'Configurable conditional follow-up questions for quote field responses';
