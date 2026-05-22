create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can view admin users" on public.admin_users;

create policy "Admins can view admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

grant select on public.admin_users to authenticated;

drop policy if exists "Admins can view all feedback" on public.app_feedback;
drop policy if exists "Admins can update feedback" on public.app_feedback;

create policy "Admins can view all feedback"
on public.app_feedback
for select
to authenticated
using (public.is_admin());

create policy "Admins can update feedback"
on public.app_feedback
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant update on public.app_feedback to authenticated;

drop policy if exists "Admins can view all report flags" on public.parking_report_flags;
drop policy if exists "Admins can delete report flags" on public.parking_report_flags;

create policy "Admins can view all report flags"
on public.parking_report_flags
for select
to authenticated
using (public.is_admin());

create policy "Admins can delete report flags"
on public.parking_report_flags
for delete
to authenticated
using (public.is_admin());

grant delete on public.parking_report_flags to authenticated;

drop policy if exists "Admins can view all app error logs" on public.app_error_logs;
drop policy if exists "Admins can delete app error logs" on public.app_error_logs;

create policy "Admins can view all app error logs"
on public.app_error_logs
for select
to authenticated
using (public.is_admin());

create policy "Admins can delete app error logs"
on public.app_error_logs
for delete
to authenticated
using (public.is_admin());

grant delete on public.app_error_logs to authenticated;

drop policy if exists "Admins can manage partner businesses" on public.partner_businesses;

create policy "Admins can manage partner businesses"
on public.partner_businesses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert, update, delete on public.partner_businesses to authenticated;

-- After running this migration, add your own Supabase auth user as admin:
-- insert into public.admin_users (user_id, role)
-- values ('YOUR_AUTH_USER_ID_HERE', 'owner')
-- on conflict (user_id) do update set role = excluded.role;
