create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null default 'bug' check (category in ('bug', 'idea', 'support', 'store_review', 'other')),
  message text not null check (char_length(trim(message)) between 8 and 4000),
  contact_email text,
  app_version text,
  platform text,
  device_info jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_at_idx
on public.app_feedback (created_at desc);

create index if not exists app_feedback_user_id_idx
on public.app_feedback (user_id, created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "Users can create their feedback" on public.app_feedback;
drop policy if exists "Anonymous users can create feedback" on public.app_feedback;
drop policy if exists "Users can view their feedback" on public.app_feedback;

create policy "Users can create their feedback"
on public.app_feedback
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

create policy "Anonymous users can create feedback"
on public.app_feedback
for insert
to anon
with check (user_id is null);

create policy "Users can view their feedback"
on public.app_feedback
for select
to authenticated
using (auth.uid() = user_id);

grant select, insert on public.app_feedback to authenticated;
grant insert on public.app_feedback to anon;

create table if not exists public.parking_report_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.parking_reports(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('fake', 'wrong_location', 'duplicate', 'unsafe', 'other')),
  note text,
  report_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, reporter_user_id, reason)
);

create index if not exists parking_report_flags_report_id_idx
on public.parking_report_flags (report_id, created_at desc);

alter table public.parking_report_flags enable row level security;

drop policy if exists "Users can flag reports" on public.parking_report_flags;
drop policy if exists "Users can view their report flags" on public.parking_report_flags;

create policy "Users can flag reports"
on public.parking_report_flags
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

create policy "Users can view their report flags"
on public.parking_report_flags
for select
to authenticated
using (auth.uid() = reporter_user_id);

grant select, insert on public.parking_report_flags to authenticated;

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'app' check (source in ('app', 'error_boundary', 'manual_feedback', 'network', 'unknown')),
  message text not null,
  stack text,
  app_version text,
  platform text,
  device_info jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_error_logs_created_at_idx
on public.app_error_logs (created_at desc);

create index if not exists app_error_logs_user_id_idx
on public.app_error_logs (user_id, created_at desc);

alter table public.app_error_logs enable row level security;

drop policy if exists "Users can create their app error logs" on public.app_error_logs;
drop policy if exists "Anonymous users can create app error logs" on public.app_error_logs;
drop policy if exists "Users can view their app error logs" on public.app_error_logs;

create policy "Users can create their app error logs"
on public.app_error_logs
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

create policy "Anonymous users can create app error logs"
on public.app_error_logs
for insert
to anon
with check (user_id is null);

create policy "Users can view their app error logs"
on public.app_error_logs
for select
to authenticated
using (auth.uid() = user_id);

grant select, insert on public.app_error_logs to authenticated;
grant insert on public.app_error_logs to anon;

create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set
    referred_by = null,
    referral_redeemed_at = null
  where referred_by = v_user_id;

  update public.parking_reports
  set
    claimed_by = null,
    claimed_at = null,
    claim_expires_at = null
  where claimed_by = v_user_id::text;

  update public.parking_reports
  set invalidated_by = null
  where invalidated_by = v_user_id;

  delete from public.app_feedback
  where user_id = v_user_id;

  delete from public.app_error_logs
  where user_id = v_user_id;

  delete from public.parking_report_flags
  where reporter_user_id = v_user_id;

  delete from public.notification_preferences
  where user_id = v_user_id;

  delete from public.parking_reports
  where report_user_id = v_user_id::text;

  delete from public.profiles
  where id = v_user_id;

  return jsonb_build_object(
    'deleted', true,
    'user_id', v_user_id
  );
end;
$$;

grant execute on function public.delete_my_account_data() to authenticated;
