-- Helper to trigger a PostgREST schema cache reload on demand
create or replace function public.reload_postgrest_schema()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify('pgrst', 'reload schema');
  return true;
end;
$$;

comment on function public.reload_postgrest_schema() is 'Triggers a PostgREST schema cache reload so new columns are immediately available to API requests.';

revoke all on function public.reload_postgrest_schema() from public;
grant execute on function public.reload_postgrest_schema() to authenticated;
grant execute on function public.reload_postgrest_schema() to service_role;
