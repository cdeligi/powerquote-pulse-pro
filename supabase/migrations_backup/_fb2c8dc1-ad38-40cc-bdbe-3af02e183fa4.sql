-- Remove zero/invalid width/height slots from chassis_types.visual_layout
UPDATE public.chassis_types
SET visual_layout = jsonb_set(
  visual_layout,
  '{slots}',
  (
    SELECT COALESCE(
      jsonb_agg(s) FILTER (
        WHERE
          (s->>'width')  ~ '^[0-9]+(\.[0-9]+)?$' AND
          (s->>'height') ~ '^[0-9]+(\.[0-9]+)?$' AND
          (s->>'x')      ~ '^-?[0-9]+(\.[0-9]+)?$' AND
          (s->>'y')      ~ '^-?[0-9]+(\.[0-9]+)?$' AND
          (s->>'width')::numeric  >= 8 AND
          (s->>'height')::numeric >= 8
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(visual_layout->'slots') AS s
  ),
  true
)
WHERE visual_layout ? 'slots';