
-- 1) Ensure a single config row per Level 4 product and enable embedding via FK

-- Add a unique constraint so we can upsert by level4_product_id
ALTER TABLE public.level4_product_configs
  ADD CONSTRAINT level4_product_configs_level4_product_id_key UNIQUE (level4_product_id);

-- Add FK so PostgREST can discover the relationship for embeds:
-- level4_products (id) -> level4_product_configs (level4_product_id)
ALTER TABLE public.level4_product_configs
  ADD CONSTRAINT level4_product_configs_level4_product_id_fkey
  FOREIGN KEY (level4_product_id)
  REFERENCES public.level4_products (id)
  ON DELETE CASCADE;

-- 2) Also make level4_configuration_options embeddable from level4_products
ALTER TABLE public.level4_configuration_options
  ADD CONSTRAINT level4_configuration_options_level4_product_id_fkey
  FOREIGN KEY (level4_product_id)
  REFERENCES public.level4_products (id)
  ON DELETE CASCADE;
