-- Create chassis_types table for configurable chassis layouts/types
CREATE TABLE IF NOT EXISTS public.chassis_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  total_slots integer NOT NULL,
  cpu_slot_index integer NOT NULL DEFAULT 0,
  layout_rows jsonb,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chassis_types ENABLE ROW LEVEL SECURITY;

-- Policies: admins manage, authenticated can read (idempotent)
DO $$ BEGIN
  CREATE POLICY "Admins can manage chassis types"
  ON public.chassis_types
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view chassis types"
  ON public.chassis_types
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS set_chassis_types_updated_at ON public.chassis_types;
CREATE TRIGGER set_chassis_types_updated_at
BEFORE UPDATE ON public.chassis_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial types (idempotent)
INSERT INTO public.chassis_types (code, name, total_slots, cpu_slot_index, layout_rows, enabled)
VALUES
  ('N/A', 'Not Applicable', 0, 0, NULL, true),
  ('LTX', 'LTX', 14, 0, NULL, true),
  ('MTX', 'MTX', 7, 0, NULL, true),
  ('STX', 'STX', 4, 0, NULL, true)
ON CONFLICT (code) DO NOTHING;