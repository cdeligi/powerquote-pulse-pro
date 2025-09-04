-- 1) Extend part_number_codes with exclusivity and color
ALTER TABLE public.part_number_codes
ADD COLUMN IF NOT EXISTS exclusive_in_slots boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS color text NULL;

-- Keep existing RLS (admins manage, users can read)
-- No changes needed to policies.
