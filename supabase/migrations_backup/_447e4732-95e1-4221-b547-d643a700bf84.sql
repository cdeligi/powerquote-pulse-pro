-- Helper function to validate that all integers in an array are positive (or array is NULL)
CREATE OR REPLACE FUNCTION public.array_all_positive(arr integer[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN arr IS NULL THEN true
    ELSE NOT EXISTS (SELECT 1 FROM unnest(arr) AS v WHERE v IS NULL OR v <= 0)
  END;
$$;

-- 1) Normalize any remaining bad data (idempotent)
UPDATE public.part_number_codes
SET standard_position = NULL
WHERE standard_position IS NOT NULL AND standard_position <= 0;

UPDATE public.part_number_codes
SET designated_positions = COALESCE(
  (
    SELECT ARRAY_AGG(v)
    FROM UNNEST(designated_positions) AS v
    WHERE v IS NOT NULL AND v > 0
  ),
  '{}'::integer[]
)
WHERE NOT public.array_all_positive(designated_positions);

-- 2) Add constraints using the immutable helper function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pnc_standard_position_positive'
  ) THEN
    ALTER TABLE public.part_number_codes
    ADD CONSTRAINT chk_pnc_standard_position_positive
    CHECK (standard_position IS NULL OR standard_position > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pnc_designated_positions_positive'
  ) THEN
    ALTER TABLE public.part_number_codes
    ADD CONSTRAINT chk_pnc_designated_positions_positive
    CHECK (public.array_all_positive(designated_positions)) NOT VALID;
  END IF;
END $$;

-- 3) Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pnc_is_standard
  ON public.part_number_codes (is_standard)
  WHERE is_standard = true;

CREATE INDEX IF NOT EXISTS idx_pnc_designated_only
  ON public.part_number_codes (designated_only)
  WHERE designated_only = true;

CREATE INDEX IF NOT EXISTS idx_pnc_outside_chassis
  ON public.part_number_codes (outside_chassis)
  WHERE outside_chassis = true;

CREATE INDEX IF NOT EXISTS idx_pnc_standard_position
  ON public.part_number_codes (standard_position);

CREATE INDEX IF NOT EXISTS idx_pnc_designated_positions
  ON public.part_number_codes USING GIN (designated_positions);

-- 4) Comments
COMMENT ON COLUMN public.part_number_codes.is_standard IS 'Standard/mandatory item for the chassis; auto-placed.';
COMMENT ON COLUMN public.part_number_codes.standard_position IS 'Default slot position for standard item (1-indexed).';
COMMENT ON COLUMN public.part_number_codes.designated_only IS 'If true, item can only be used in designated_positions.';
COMMENT ON COLUMN public.part_number_codes.designated_positions IS 'Allowed slot numbers (1-indexed) when designated_only is true.';
COMMENT ON COLUMN public.part_number_codes.outside_chassis IS 'Item does not consume a rack slot (external accessory).';
COMMENT ON COLUMN public.part_number_codes.notes IS 'Admin notes for this code.';