-- Rename prefix to part_number and remove unnecessary fields from part_number_configs
ALTER TABLE part_number_configs 
RENAME COLUMN prefix TO part_number;

ALTER TABLE part_number_configs 
DROP COLUMN IF EXISTS suffix_separator,
DROP COLUMN IF EXISTS remote_off_code,
DROP COLUMN IF EXISTS remote_on_code;