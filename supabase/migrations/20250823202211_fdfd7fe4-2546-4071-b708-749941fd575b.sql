-- Add missing columns to part_number_configs table for full functionality
ALTER TABLE part_number_configs 
ADD COLUMN IF NOT EXISTS slot_span integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS standard_position integer,
ADD COLUMN IF NOT EXISTS designated_only boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS designated_positions integer[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS outside_chassis boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS exclusive_in_slots boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_part_number_configs_level2_product ON part_number_configs(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_part_number_codes_level2_product ON part_number_codes(level2_product_id);
CREATE INDEX IF NOT EXISTS idx_part_number_codes_level3_product ON part_number_codes(level3_product_id);