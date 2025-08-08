-- Add new fields to part_number_codes for data-driven QTMS configuration
-- Safe alterations with IF NOT EXISTS to avoid errors if re-run

-- 1) Add columns
ALTER TABLE IF EXISTS public.part_number_codes
  ADD COLUMN IF NOT EXISTS is_standard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS standard_position integer,
  ADD COLUMN IF NOT EXISTS designated_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS designated_positions integer[],
  ADD COLUMN IF NOT EXISTS outside_chassis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2) Constraints for data quality
DO $$
BEGIN
  -- Positive standard position when provided
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pnc_standard_position_positive'
  ) THEN
    ALTER TABLE public.part_number_codes
    ADD CONSTRAINT chk_pnc_standard_position_positive
    CHECK (standard_position IS NULL OR standard_position > 0);
  END IF;

  -- All designated positions must be positive integers
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pnc_designated_positions_positive'
  ) THEN
    ALTER TABLE public.part_number_codes
    ADD CONSTRAINT chk_pnc_designated_positions_positive
    CHECK (
      designated_positions IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(designated_positions) AS v
        WHERE v IS NULL OR v <= 0
      )
    );
  END IF;
END $$;

-- 3) Helpful indexes (including partial indexes to keep them small)
CREATE INDEX IF NOT EXISTS idx_pnc_is_standard
  ON public.part_number_codes (is_standard)
  WHERE is_standard = true;

CREATE INDEX IF NOT EXISTS idx_pnc_designated_only
  ON public.part_number_codes (designated_only)
  WHERE designated_only = true;

CREATE INDEX IF NOT EXISTS idx_pnc_outside_chassis
  ON public.part_number_codes (outside_chassis)
  WHERE outside_chassis = true;

-- Position lookups
CREATE INDEX IF NOT EXISTS idx_pnc_standard_position
  ON public.part_number_codes (standard_position);

-- Array membership checks for slot restrictions
CREATE INDEX IF NOT EXISTS idx_pnc_designated_positions
  ON public.part_number_codes USING GIN (designated_positions);

-- Optional: clarify purpose
COMMENT ON COLUMN public.part_number_codes.is_standard IS 'This code represents a standard/mandatory item for the chassis and should be auto-placed.';
COMMENT ON COLUMN public.part_number_codes.standard_position IS 'If set, the default slot position for this standard item (1-indexed).';
COMMENT ON COLUMN public.part_number_codes.designated_only IS 'If true, this code can only be used in the specified designated_positions.';
COMMENT ON COLUMN public.part_number_codes.designated_positions IS 'Array of allowed slot numbers (1-indexed) when designated_only is true.';
COMMENT ON COLUMN public.part_number_codes.outside_chassis IS 'If true, the item does not consume a rack slot (e.g., remote display, external accessories).';
COMMENT ON COLUMN public.part_number_codes.notes IS 'Free-form admin notes for this code.';