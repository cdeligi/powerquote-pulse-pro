-- Add new columns to support exclusivity and admin-configured colors for Level 3 items per Level 2 config
ALTER TABLE public.part_number_codes
  ADD COLUMN IF NOT EXISTS exclusive_in_slots boolean NOT NULL DEFAULT false;

ALTER TABLE public.part_number_codes
  ADD COLUMN IF NOT EXISTS color text;