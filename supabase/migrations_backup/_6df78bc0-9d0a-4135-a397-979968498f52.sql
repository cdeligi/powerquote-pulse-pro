-- Allow standard_position to be zero (CPU in logical slot 0)
ALTER TABLE public.part_number_codes DROP CONSTRAINT IF EXISTS chk_pnc_standard_position_positive;

ALTER TABLE public.part_number_codes
ADD CONSTRAINT chk_pnc_standard_position_nonnegative
CHECK ((standard_position IS NULL) OR (standard_position >= 0));