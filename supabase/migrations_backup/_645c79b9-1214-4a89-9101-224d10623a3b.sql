-- Add info_url field to level4_dropdown_options table for per-option URLs
ALTER TABLE public.level4_dropdown_options 
ADD COLUMN IF NOT EXISTS info_url text;