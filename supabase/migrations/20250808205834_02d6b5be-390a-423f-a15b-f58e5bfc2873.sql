
-- 1) Seed/Upsert part_number_configs for LTX/MTX/STX so we can compute PNs data-driven
INSERT INTO part_number_configs (level2_product_id, prefix, slot_placeholder, slot_count, suffix_separator, remote_off_code, remote_on_code)
VALUES
  ('ltx-chassis', 'QTMS-LTX-', '0', 14, '-', '0', 'D1'),
  ('mtx-chassis', 'QTMS-MTX-', '0', 7,  '-', '0', 'D1'),
  ('stx-chassis', 'QTMS-STX-', '0', 4,  '-', '0', 'D1')
ON CONFLICT (level2_product_id) DO UPDATE
SET
  prefix = EXCLUDED.prefix,
  slot_placeholder = EXCLUDED.slot_placeholder,
  slot_count = EXCLUDED.slot_count,
  suffix_separator = EXCLUDED.suffix_separator,
  remote_off_code = EXCLUDED.remote_off_code,
  remote_on_code = EXCLUDED.remote_on_code,
  updated_at = now();

-- 2) Upsert default part_number_codes for common Level 3s under each chassis
-- Relay cards -> R
INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p3.id, p3.parent_product_id, 'R', COALESCE(p3.slot_requirement, 1)
FROM products p3
WHERE p3.product_level = 3 AND p3.enabled = true AND p3.name ILIKE '%Relay%Card%'
ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- Analog cards -> A
INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p3.id, p3.parent_product_id, 'A', COALESCE(p3.slot_requirement, 1)
FROM products p3
WHERE p3.product_level = 3 AND p3.enabled = true AND p3.name ILIKE '%Analog%Card%'
ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- Fiber cards -> F{inputs} (derive inputs from specifications JSON)
INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p3.id, p3.parent_product_id,
       'F' || COALESCE(NULLIF((p3.specifications ->> 'inputs'), '')::int, 0),
       COALESCE(p3.slot_requirement, 1)
FROM products p3
WHERE p3.product_level = 3 AND p3.enabled = true AND p3.name ILIKE 'Fiber Optic Communication Card%'
ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- Bushing cards -> B{numberOfBushings}, span 2
INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p3.id, p3.parent_product_id, 'B{numberOfBushings}', 2
FROM products p3
WHERE p3.product_level = 3 AND p3.enabled = true AND p3.name ILIKE '%Bushing%Card%'
ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- Display as a Card -> D
INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
SELECT p3.id, p3.parent_product_id, 'D', 1
FROM products p3
WHERE p3.product_level = 3 AND p3.enabled = true AND p3.id = 'display-card'
ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- 3) Update Display card to mark type and allowed slot metadata (LTX -> only slot 8)
UPDATE products
SET
  subcategory = 'display',
  specifications = COALESCE(specifications, '{}'::jsonb) ||
                   jsonb_build_object(
                     'allowed_slots_by_chassis',
                     jsonb_build_object('LTX', to_jsonb(ARRAY[8]))
                   )
WHERE id = 'display-card';

-- 4) Insert Remote Display as Level 3 for each chassis (does not occupy a slot)
INSERT INTO products (id, name, description, price, cost, enabled, category, subcategory, parent_product_id, product_level, slot_requirement, specifications)
VALUES
  ('remote-display-ltx', 'Remote Display', 'Remote display for QTMS LTX chassis', 850, 0, true, 'accessory', 'remote', 'ltx-chassis', 3, 0, '{"is_accessory": true}'),
  ('remote-display-mtx', 'Remote Display', 'Remote display for QTMS MTX chassis', 850, 0, true, 'accessory', 'remote', 'mtx-chassis', 3, 0, '{"is_accessory": true}'),
  ('remote-display-stx', 'Remote Display', 'Remote display for QTMS STX chassis', 850, 0, true, 'accessory', 'remote', 'stx-chassis', 3, 0, '{"is_accessory": true}')
ON CONFLICT (id) DO UPDATE
SET parent_product_id = EXCLUDED.parent_product_id,
    enabled = EXCLUDED.enabled,
    price = EXCLUDED.price,
    subcategory = EXCLUDED.subcategory,
    specifications = EXCLUDED.specifications,
    updated_at = now();

-- Optional PN code for Remote Display if you want a code (not strictly needed because suffix is governed by part_number_configs)
-- Uncomment if desired:
-- INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
-- VALUES
--   ('remote-display-ltx', 'ltx-chassis', 'RD', 0),
--   ('remote-display-mtx', 'mtx-chassis', 'RD', 0),
--   ('remote-display-stx', 'stx-chassis', 'RD', 0)
-- ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
-- SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();

-- 5) Insert CPU Module as Level 3 for each chassis (logical slot 0 by convention)
INSERT INTO products (id, name, description, price, cost, enabled, category, subcategory, parent_product_id, product_level, slot_requirement, specifications)
VALUES
  ('cpu-card-ltx', 'CPU Module', 'CPU module for QTMS LTX chassis (standard in slot 0)', 0, 0, true, 'module', 'cpu', 'ltx-chassis', 3, 1, '{"allowed_slots_by_chassis":{"LTX":[0]}}'),
  ('cpu-card-mtx', 'CPU Module', 'CPU module for QTMS MTX chassis (standard in slot 0)', 0, 0, true, 'module', 'cpu', 'mtx-chassis', 3, 1, '{"allowed_slots_by_chassis":{"MTX":[0]}}'),
  ('cpu-card-stx', 'CPU Module', 'CPU module for QTMS STX chassis (standard in slot 0)', 0, 0, true, 'module', 'cpu', 'stx-chassis', 3, 1, '{"allowed_slots_by_chassis":{"STX":[0]}}')
ON CONFLICT (id) DO UPDATE
SET parent_product_id = EXCLUDED.parent_product_id,
    enabled = EXCLUDED.enabled,
    subcategory = EXCLUDED.subcategory,
    specifications = EXCLUDED.specifications,
    updated_at = now();

-- Optional PN code for CPU if you want a leading code; can be integrated later when the generator is extended.
-- INSERT INTO part_number_codes (level3_product_id, level2_product_id, template, slot_span)
-- VALUES
--   ('cpu-card-ltx', 'ltx-chassis', 'C', 0),
--   ('cpu-card-mtx', 'mtx-chassis', 'C', 0),
--   ('cpu-card-stx', 'stx-chassis', 'C', 0)
-- ON CONFLICT (level3_product_id, level2_product_id) DO UPDATE
-- SET template = EXCLUDED.template, slot_span = EXCLUDED.slot_span, updated_at = now();
