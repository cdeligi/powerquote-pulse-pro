-- Create chassis slot options table for slot-specific L3 product restrictions
CREATE TABLE IF NOT EXISTS public.chassis_slot_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chassis_type_id uuid NOT NULL REFERENCES public.chassis_types(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  level3_product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chassis_type_id, slot_number, level3_product_id)
);

ALTER TABLE public.chassis_slot_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_slot_options" ON public.chassis_slot_options
  FOR SELECT USING (true);

CREATE POLICY "write_slot_options_admins" ON public.chassis_slot_options
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Optional: Add default slot names for existing chassis types
UPDATE public.chassis_types
SET visual_layout = jsonb_set(
  visual_layout,
  '{slots}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN s ? 'name' THEN s
        ELSE jsonb_set(s, '{name}', to_jsonb(CONCAT('Slot ', (s->>'slotNumber')::int + 1)))
      END
    )
    FROM jsonb_array_elements(visual_layout->'slots') AS s
  ),
  false
)
WHERE visual_layout IS NOT NULL;