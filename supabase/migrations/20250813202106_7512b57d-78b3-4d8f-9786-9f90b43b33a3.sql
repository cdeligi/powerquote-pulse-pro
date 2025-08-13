-- Phase 1: Database Schema Migration
-- Add visual_layout column to chassis_types table
ALTER TABLE chassis_types 
ADD COLUMN IF NOT EXISTS visual_layout JSONB;

-- Remove cpu_slot_index column if it exists
ALTER TABLE chassis_types 
DROP COLUMN IF EXISTS cpu_slot_index;

-- Update existing records to have default visual layouts
UPDATE chassis_types 
SET visual_layout = jsonb_build_object(
  'slots', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'slotNumber', slot_num,
        'x', 20 + (slot_num % 8) * 90,
        'y', 20 + (slot_num / 8) * 70,
        'width', 80,
        'height', 60
      )
    )
    FROM generate_series(0, total_slots - 1) AS slot_num
  ),
  'canvasWidth', 800,
  'canvasHeight', 600
)
WHERE visual_layout IS NULL;