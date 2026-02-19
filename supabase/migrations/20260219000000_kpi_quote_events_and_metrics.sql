----------------------------
-- 1) quote_events table
----------------------------
create table if not exists public.quote_events (
  id bigserial primary key,
  quote_id text not null,
  event_type text not null,
  actor_id uuid null,
  actor_role text null,
  previous_state text null,
  new_state text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

-- FK (assumindo quotes.id TEXT)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='quotes'
  ) then
    begin
      alter table public.quote_events
        add constraint quote_events_quote_id_fkey
        foreign key (quote_id) references public.quotes(id) on delete cascade;
    exception when duplicate_object then
      null;
    when datatype_mismatch then
      null;
    end;
  end if;
end $$;

create index if not exists quote_events_quote_id_idx on public.quote_events(quote_id);
create index if not exists quote_events_event_type_idx on public.quote_events(event_type);
create index if not exists quote_events_created_at_idx on public.quote_events(created_at);
create index if not exists quote_events_actor_id_idx on public.quote_events(actor_id);

-- RLS
alter table public.quote_events enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and upper(coalesce(p.role,'')) in ('ADMIN','FINANCE','MASTER')
  );
$$;

drop policy if exists "staff can read quote_events" on public.quote_events;
create policy "staff can read quote_events"
on public.quote_events for select
to authenticated
using (public.is_staff());

----------------------------
-- 2) Ensure KPI columns in quotes (best-effort)
----------------------------
do $$
begin
  begin
    alter table public.quotes add column if not exists finance_required_at timestamptz null;
  exception when undefined_table then null;
  end;

  begin
    alter table public.quotes add column if not exists admin_decision_at timestamptz null;
  exception when undefined_table then null;
  end;

  begin
    alter table public.quotes add column if not exists admin_decision_by uuid null;
  exception when undefined_table then null;
  end;
end $$;

----------------------------
-- 3) KPI Facts View
----------------------------
create or replace view public.quote_kpi_facts as
with ev as (
  select
    quote_id,
    min(created_at) filter (where event_type='quote_submitted') as ev_submitted_at,
    min(created_at) filter (where event_type='quote_claimed_admin') as ev_admin_claimed_at,
    min(created_at) filter (where event_type='quote_claimed_finance') as ev_finance_claimed_at,
    min(created_at) filter (
      where event_type='quote_admin_decision'
        and coalesce(payload->>'decision','')='requires_finance'
    ) as ev_finance_required_at,
    min(created_at) filter (where event_type='quote_admin_decision') as ev_admin_decision_at,
    min(created_at) filter (where event_type='quote_finance_decision') as ev_finance_decision_at
  from public.quote_events
  group by quote_id
)
select
  q.id as quote_id,
  q.status,
  q.workflow_state,
  q.submitted_by_email,
  q.submitted_by_name,

  q.admin_reviewer_id,
  q.finance_reviewer_id,
  q.requires_finance_approval as requires_finance,

  coalesce(q.submitted_at, ev.ev_submitted_at, q.created_at) as submitted_at,
  coalesce(q.admin_claimed_at, ev.ev_admin_claimed_at) as admin_claimed_at,
  coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at) as admin_decision_at,

  coalesce(q.finance_required_at, ev.ev_finance_required_at) as finance_required_at,
  coalesce(q.finance_claimed_at, ev.ev_finance_claimed_at) as finance_claimed_at,
  coalesce(q.finance_decision_at, ev.ev_finance_decision_at) as finance_decision_at,

  case
    when coalesce(q.requires_finance_approval,false) then coalesce(q.finance_decision_at, ev.ev_finance_decision_at)
    else coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at)
  end as final_decision_at,

  case
    when coalesce(q.admin_claimed_at, ev.ev_admin_claimed_at) is not null
      then extract(epoch from (coalesce(q.admin_claimed_at, ev.ev_admin_claimed_at) - coalesce(q.submitted_at, ev.ev_submitted_at, q.created_at)))
    else null
  end as admin_claim_seconds,

  case
    when coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at) is not null
     and coalesce(q.admin_claimed_at, ev.ev_admin_claimed_at) is not null
      then extract(epoch from (coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at) - coalesce(q.admin_claimed_at, ev.ev_admin_claimed_at)))
    else null
  end as admin_work_seconds,

  case
    when coalesce(q.finance_claimed_at, ev.ev_finance_claimed_at) is not null
     and coalesce(q.finance_required_at, ev.ev_finance_required_at) is not null
      then extract(epoch from (coalesce(q.finance_claimed_at, ev.ev_finance_claimed_at) - coalesce(q.finance_required_at, ev.ev_finance_required_at)))
    else null
  end as finance_claim_seconds,

  case
    when coalesce(q.finance_decision_at, ev.ev_finance_decision_at) is not null
     and coalesce(q.finance_claimed_at, ev.ev_finance_claimed_at) is not null
      then extract(epoch from (coalesce(q.finance_decision_at, ev.ev_finance_decision_at) - coalesce(q.finance_claimed_at, ev.ev_finance_claimed_at)))
    else null
  end as finance_work_seconds,

  case
    when (
      case
        when coalesce(q.requires_finance_approval,false) then coalesce(q.finance_decision_at, ev.ev_finance_decision_at)
        else coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at)
      end
    ) is not null
      then extract(epoch from ((
        case
          when coalesce(q.requires_finance_approval,false) then coalesce(q.finance_decision_at, ev.ev_finance_decision_at)
          else coalesce(q.admin_decision_at, ev.ev_admin_decision_at, q.reviewed_at)
        end
      ) - coalesce(q.submitted_at, ev.ev_submitted_at, q.created_at)))
    else null
  end as total_cycle_seconds

from public.quotes q
left join ev on ev.quote_id = q.id;

----------------------------
-- 4) KPI RPC
----------------------------
create or replace function public.get_quote_kpi(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text default 'day',
  p_lane text default 'both',
  p_sla_hours int default 48
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_is_staff boolean;
begin
  select public.is_staff() into v_is_staff;
  if not v_is_staff then
    raise exception 'not authorized';
  end if;

  return (
    with base as (
      select *
      from public.quote_kpi_facts
      where submitted_at >= p_start
        and submitted_at < p_end
    ),
    filtered as (
      select *
      from base
      where
        (p_lane = 'both')
        or (p_lane = 'admin' and coalesce(requires_finance,false) = false)
        or (p_lane = 'finance' and coalesce(requires_finance,false) = true)
    ),
    sla as (
      select
        *,
        (final_decision_at is not null and (total_cycle_seconds/3600.0) <= p_sla_hours) as met_sla
      from filtered
    ),
    summary as (
      select
        count(*) as total_submitted,
        count(*) filter (where final_decision_at is not null) as total_completed,
        count(*) filter (where status = 'approved') as approved,
        count(*) filter (where status = 'rejected') as rejected,

        avg(total_cycle_seconds) filter (where final_decision_at is not null) as avg_total_cycle_seconds,
        avg(admin_claim_seconds) filter (where admin_claim_seconds is not null) as avg_admin_claim_seconds,
        avg(admin_work_seconds) filter (where admin_work_seconds is not null) as avg_admin_work_seconds,
        avg(finance_claim_seconds) filter (where finance_claim_seconds is not null) as avg_finance_claim_seconds,
        avg(finance_work_seconds) filter (where finance_work_seconds is not null) as avg_finance_work_seconds,

        count(*) filter (where met_sla) as met_sla,
        count(*) filter (where final_decision_at is not null) as considered_sla
      from sla
    ),
    backlog_admin as (
      select
        count(*) as backlog,
        count(*) filter (where extract(epoch from (now() - submitted_at))/3600 > p_sla_hours) as backlog_over_sla,
        avg(extract(epoch from (now() - submitted_at))) as avg_age_seconds
      from public.quote_kpi_facts
      where admin_claimed_at is null
        and coalesce(requires_finance,false) = false
        and submitted_at < p_end
        and submitted_at >= p_start
    ),
    backlog_finance as (
      select
        count(*) as backlog,
        count(*) filter (where extract(epoch from (now() - finance_required_at))/3600 > p_sla_hours) as backlog_over_sla,
        avg(extract(epoch from (now() - finance_required_at))) as avg_age_seconds
      from public.quote_kpi_facts
      where coalesce(requires_finance,false) = true
        and finance_claimed_at is null
        and finance_required_at is not null
        and finance_required_at < p_end
        and finance_required_at >= p_start
    ),
    timeseries as (
      select
        bucket_start,
        count(*) as submitted,
        count(*) filter (where final_decision_at is not null) as completed,
        avg(total_cycle_seconds) filter (where final_decision_at is not null) as avg_cycle_seconds,
        count(*) filter (where met_sla) as met_sla,
        count(*) filter (where final_decision_at is not null) as considered_sla
      from (
        select
          case
            when p_bucket='day' then date_trunc('day', submitted_at)
            when p_bucket='week' then date_trunc('week', submitted_at)
            when p_bucket='biweek' then date_trunc('week', submitted_at)
              - ((extract(week from submitted_at)::int - 1) % 2) * interval '1 week'
            when p_bucket='month' then date_trunc('month', submitted_at)
            else date_trunc('day', submitted_at)
          end as bucket_start,
          *
        from sla
      ) x
      group by 1
      order by 1
    ),
    per_user as (
      select
        case
          when coalesce(requires_finance,false) then finance_reviewer_id
          else admin_reviewer_id
        end as user_id,
        count(*) filter (where final_decision_at is not null) as completed,
        count(*) filter (where status='approved') as approved,
        count(*) filter (where status='rejected') as rejected,
        avg(total_cycle_seconds) filter (where final_decision_at is not null) as avg_cycle_seconds,
        avg(case when coalesce(requires_finance,false) then finance_claim_seconds else admin_claim_seconds end) as avg_claim_seconds,
        avg(case when coalesce(requires_finance,false) then finance_work_seconds else admin_work_seconds end) as avg_work_seconds,
        count(*) filter (where met_sla) as met_sla,
        count(*) filter (where final_decision_at is not null) as considered_sla
      from sla
      group by 1
    )
    select jsonb_build_object(
      'summary', (select to_jsonb(summary) from summary),
      'backlog', jsonb_build_object(
        'admin', (select to_jsonb(backlog_admin) from backlog_admin),
        'finance', (select to_jsonb(backlog_finance) from backlog_finance)
      ),
      'timeseries', (select coalesce(jsonb_agg(to_jsonb(timeseries)), '[]'::jsonb) from timeseries),
      'per_user', (select coalesce(jsonb_agg(to_jsonb(per_user)), '[]'::jsonb) from per_user)
    )
  );
end;
$$;

grant execute on function public.get_quote_kpi(timestamptz, timestamptz, text, text, int) to authenticated;
