-- Add reminder tracking fields for user access approval workflow

alter table public.user_requests
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminder_sent_at timestamptz null;
