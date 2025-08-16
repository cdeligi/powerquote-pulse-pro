
-- Revert column name to maintain a single field and match existing code paths
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'part_number_configs'
      and column_name = 'part_number'
  ) then
    alter table public.part_number_configs
      rename column part_number to prefix;
  end if;
end $$;

-- Remove obsolete fields if they exist (as requested)
alter table public.part_number_configs drop column if exists suffix_separator;
alter table public.part_number_configs drop column if exists remote_off_code;
alter table public.part_number_configs drop column if exists remote_on_code;
