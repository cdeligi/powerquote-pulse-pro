-- Create data-driven part number configuration tables
-- 1) part_number_configs: per Level 2 product (chassis)
CREATE TABLE IF NOT EXISTS public.part_number_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level2_product_id text NOT NULL UNIQUE,
  prefix text NOT NULL,
  slot_placeholder text NOT NULL DEFAULT '0',
  slot_count integer NOT NULL,
  suffix_separator text NOT NULL DEFAULT '-',
  remote_off_code text NOT NULL DEFAULT '0',
  remote_on_code text NOT NULL DEFAULT 'D1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) part_number_codes: per Level 3 product (card)
-- template supports placeholders like {inputs}, {numberOfBushings}, {sensorCount}
CREATE TABLE IF NOT EXISTS public.part_number_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level3_product_id text NOT NULL,
  -- Optional: override per specific Level 2 product (null means generic)
  level2_product_id text NULL,
  template text NOT NULL, -- e.g., 'D', 'A', 'F{inputs}', 'B{numberOfBushings}', 'R'
  slot_span integer NOT NULL DEFAULT 1,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_code_per_context UNIQUE (level3_product_id, level2_product_id)
);

-- Enable RLS
ALTER TABLE public.part_number_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_number_codes ENABLE ROW LEVEL SECURITY;

-- Policies: Admins manage, authenticated can read
CREATE POLICY "Admins can manage part number configs"
ON public.part_number_configs FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Authenticated users can read part number configs"
ON public.part_number_configs FOR SELECT
USING (true);

CREATE POLICY "Admins can manage part number codes"
ON public.part_number_codes FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Authenticated users can read part number codes"
ON public.part_number_codes FOR SELECT
USING (true);

-- Triggers to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_part_number_configs_updated_at ON public.part_number_configs;
CREATE TRIGGER trg_part_number_configs_updated_at
BEFORE UPDATE ON public.part_number_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_part_number_codes_updated_at ON public.part_number_codes;
CREATE TRIGGER trg_part_number_codes_updated_at
BEFORE UPDATE ON public.part_number_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_partnumcfg_level2 ON public.part_number_configs(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_partnumcodes_level3 ON public.part_number_codes(level3_product_id);
CREATE INDEX IF NOT EXISTS idx_partnumcodes_level2 ON public.part_number_codes(level2_product_id);

-- Seed defaults for QTMS chassis (LTX/MTX/STX)
-- We infer Level 2 chassis by chassis_type
INSERT INTO public.part_number_configs (level2_product_id, prefix, slot_placeholder, slot_count, suffix_separator, remote_off_code, remote_on_code)
SELECT p.id,
       CASE WHEN p.chassis_type = 'LTX' THEN 'LTX'
            WHEN p.chassis_type = 'MTX' THEN 'MTX'
            WHEN p.chassis_type = 'STX' THEN 'STX'
            ELSE COALESCE(p.chassis_type, 'N/A') END AS prefix,
       '0' AS slot_placeholder,
       COALESCE((p.specifications->>'slots')::int,
                CASE WHEN p.chassis_type = 'LTX' THEN 14 WHEN p.chassis_type = 'MTX' THEN 7 ELSE 4 END) AS slot_count,
       '-' AS suffix_separator,
       '0' AS remote_off_code,
       'D1' AS remote_on_code
FROM public.products p
WHERE p.product_level = 2
  AND p.enabled = true
  AND p.chassis_type IN ('LTX','MTX','STX')
  AND NOT EXISTS (
    SELECT 1 FROM public.part_number_configs c WHERE c.level2_product_id = p.id
  );

-- Seed default codes for common Level 3 cards
-- Digital -> 'D', Analog -> 'A', Bushing -> 'B{numberOfBushings}', Relay -> 'R', Display card -> 'D'
-- Fiber communication cards use Inputs to form F{inputs}
INSERT INTO public.part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p.id, NULL,
  CASE 
    WHEN LOWER(p.name) LIKE '%fiber%' THEN 'F{inputs}'
    WHEN LOWER(p.name) LIKE '%bushing%' THEN 'B{numberOfBushings}'
    WHEN LOWER(p.name) LIKE '%relay%' THEN 'R'
    WHEN LOWER(p.name) LIKE '%display%' THEN 'D'
    WHEN LOWER(p.name) LIKE '%analog%' THEN 'A'
    WHEN LOWER(p.subcategory) LIKE '%digital%' OR LOWER(p.name) LIKE '%digital%' THEN 'D'
    ELSE 'X'
  END,
  COALESCE(p.slot_requirement, (p.specifications->>'slotRequirement')::int, 1)
FROM public.products p
WHERE p.product_level = 3
  AND p.enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM public.part_number_codes c WHERE c.level3_product_id = p.id AND c.level2_product_id IS NULL
  );