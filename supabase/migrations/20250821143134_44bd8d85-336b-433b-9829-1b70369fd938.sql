
-- 1) Create shared dropdown options table for Level 4 configs
create table if not exists public.level4_shared_options (
  id uuid primary key default gen_random_uuid(),
  level4_configuration_id uuid not null references public.level4_configurations(id) on delete cascade,
  label text not null,
  value text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS and add policies (aligned with existing level4_* tables in this project)
alter table public.level4_shared_options enable row level security;

do $$
begin
  -- SELECT: public read
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'level4_shared_options' and policyname = 'Allow public read access to level4_shared_options'
  ) then
    create policy "Allow public read access to level4_shared_options"
      on public.level4_shared_options
      for select
      using (true);
  end if;

  -- ALL: open write (matches existing permissive policies on other level4_* tables)
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'level4_shared_options' and policyname = 'level4_shared_options_all'
  ) then
    create policy "level4_shared_options_all"
      on public.level4_shared_options
      for all
      using (true)
      with check (true);
  end if;
end
$$;

-- 2) Add default option column to Level 4 configurations (references shared options)
alter table public.level4_configurations
  add column if not exists default_option_id uuid null;

-- Add FK after column exists; use ON DELETE SET NULL for safety
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'level4_configurations_default_option_id_fkey'
  ) then
    alter table public.level4_configurations
      add constraint level4_configurations_default_option_id_fkey
      foreign key (default_option_id) references public.level4_shared_options(id)
      on delete set null;
  end if;
end
$$;

-- 3) Ensure products.requires_level4_config stays in sync with specifications JSON
-- The function public.sync_requires_level4_config_column() already exists per your project context.
-- Attach BEFORE INSERT/UPDATE trigger if missing.
do $$
begin
  if not exists (
    select 1 from pg_trigger 
    where tgname = 'trg_sync_requires_level4_config_before_ins_upd'
  ) then
    create trigger trg_sync_requires_level4_config_before_ins_upd
    before insert or update on public.products
    for each row
    execute function public.sync_requires_level4_config_column();
  end if;
end
$$;
