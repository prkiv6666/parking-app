create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists rank text not null default 'Нов шофьор',
  add column if not exists badges jsonb not null default '[]'::jsonb;

update public.profiles
set rank = case
  when coalesce(points, 0) >= 600 then 'Легенда на паркирането'
  when coalesce(points, 0) >= 300 then 'Градски навигатор'
  when coalesce(points, 0) >= 150 then 'Паркинг професионалист'
  when coalesce(points, 0) >= 75 then 'Скаут за паркиране'
  when coalesce(points, 0) >= 25 then 'Наблюдател'
  else 'Нов шофьор'
end;

update public.profiles
set badges = '[]'::jsonb
where badges is null;

alter table public.parking_reports
  add column if not exists successful_validation_count integer not null default 0,
  add column if not exists author_penalized boolean not null default false,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by uuid references auth.users(id);

create table if not exists public.parking_reward_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.parking_reports(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  points_delta integer not null,
  trust_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint parking_reward_events_event_type_check check (
    event_type in (
      'report_spot_reward',
      'actor_confirm_reward',
      'actor_taken_reward',
      'actor_park_reward',
      'author_confirm_bonus',
      'author_park_bonus',
      'author_invalid_penalty'
    )
  )
);

create unique index if not exists parking_reward_events_unique_event
on public.parking_reward_events (report_id, actor_user_id, target_user_id, event_type);

alter table public.parking_reward_events enable row level security;

drop policy if exists "reward_events_select_own" on public.parking_reward_events;
create policy "reward_events_select_own"
on public.parking_reward_events
for select
to authenticated
using (actor_user_id = auth.uid() or target_user_id = auth.uid());

drop policy if exists "reward_events_insert_own" on public.parking_reward_events;
create policy "reward_events_insert_own"
on public.parking_reward_events
for insert
to authenticated
with check (actor_user_id = auth.uid());

create or replace function public.reward_rank_for_points(p_points integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_points, 0) >= 600 then 'Легенда на паркирането'
    when coalesce(p_points, 0) >= 300 then 'Градски навигатор'
    when coalesce(p_points, 0) >= 150 then 'Паркинг професионалист'
    when coalesce(p_points, 0) >= 75 then 'Скаут за паркиране'
    when coalesce(p_points, 0) >= 25 then 'Наблюдател'
    else 'Нов шофьор'
  end
$$;

create or replace function public.get_reward_badge_progress(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with profile_base as (
    select
      id,
      coalesce(points, 0) as points,
      coalesce(trust_score, 0) as trust_score,
      coalesce(reports_count, 0) as reports_count,
      coalesce(confirms_count, 0) as confirms_count,
      coalesce(taken_marks_count, 0) as taken_marks_count,
      coalesce(badges, '[]'::jsonb) as badges
    from public.profiles
    where id = p_user_id
  ),
  successful_reports as (
    select count(*)::integer as total
    from public.parking_reports
    where report_user_id = p_user_id::text
      and successful_validation_count > 0
  ),
  park_actions as (
    select count(*)::integer as total
    from public.parking_reward_events
    where target_user_id = p_user_id
      and event_type = 'actor_park_reward'
  )
  select jsonb_build_object(
    'points', profile_base.points,
    'trust_score', profile_base.trust_score,
    'reports_count', profile_base.reports_count,
    'confirms_count', profile_base.confirms_count,
    'taken_marks_count', profile_base.taken_marks_count,
    'successful_reports_count', coalesce(successful_reports.total, 0),
    'park_here_count', coalesce(park_actions.total, 0),
    'badges', profile_base.badges
  )
  from profile_base
  left join successful_reports on true
  left join park_actions on true;
$$;

create or replace function public.sync_reward_profile(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_successful_reports_count integer := 0;
  v_park_here_count integer := 0;
  v_badges text[] := array[]::text[];
  v_rank text;
  v_updated_profile jsonb;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('profile', null);
  end if;

  select count(*)::integer
  into v_successful_reports_count
  from public.parking_reports
  where report_user_id = p_user_id::text
    and successful_validation_count > 0;

  select count(*)::integer
  into v_park_here_count
  from public.parking_reward_events
  where target_user_id = p_user_id
    and event_type = 'actor_park_reward';

  if coalesce(v_profile.reports_count, 0) >= 1 then
    v_badges := array_append(v_badges, 'Първо място');
  end if;

  if coalesce(v_profile.confirms_count, 0) >= 10 then
    v_badges := array_append(v_badges, 'Потвърдител');
  end if;

  if coalesce(v_profile.taken_marks_count, 0) >= 10 then
    v_badges := array_append(v_badges, 'Финализатор');
  end if;

  if coalesce(v_profile.trust_score, 0) >= 70 then
    v_badges := array_append(v_badges, 'Надежден шофьор');
  end if;

  if coalesce(v_profile.points, 0) >= 100 then
    v_badges := array_append(v_badges, 'Градски откривател');
  end if;

  if coalesce(v_profile.points, 0) >= 500 then
    v_badges := array_append(v_badges, 'Легенда на паркирането');
  end if;

  if v_successful_reports_count >= 10 then
    v_badges := array_append(v_badges, 'Надежден подател');
  end if;

  if v_park_here_count >= 5 then
    v_badges := array_append(v_badges, 'Бърз паркиращ');
  end if;

  v_rank := public.reward_rank_for_points(v_profile.points);

  update public.profiles
  set
    rank = v_rank,
    badges = coalesce((
      select jsonb_agg(distinct badge_name)
      from unnest(v_badges) as badge_name
    ), '[]'::jsonb)
  where id = p_user_id
  returning to_jsonb(public.profiles.*) into v_updated_profile;

  return jsonb_build_object(
    'profile', v_updated_profile,
    'successful_reports_count', v_successful_reports_count,
    'park_here_count', v_park_here_count
  );
end;
$$;

create or replace function public.apply_reward_event(
  p_report_id uuid,
  p_target_user_id uuid,
  p_event_type text,
  p_points_delta integer,
  p_trust_delta integer default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_report public.parking_reports%rowtype;
  v_previous_badges jsonb := '[]'::jsonb;
  v_updated_profile jsonb;
begin
  if v_actor_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_report
  from public.parking_reports
  where id = p_report_id;

  if not found then
    raise exception 'Parking report not found';
  end if;

  if p_event_type not in (
    'report_spot_reward',
    'actor_confirm_reward',
    'actor_taken_reward',
    'actor_park_reward',
    'author_confirm_bonus',
    'author_park_bonus',
    'author_invalid_penalty'
  ) then
    raise exception 'Unsupported reward event type';
  end if;

  if p_event_type = 'report_spot_reward' and v_actor_user_id <> p_target_user_id then
    raise exception 'Report creation reward can only target the acting user';
  end if;

  if p_event_type in ('actor_confirm_reward', 'actor_taken_reward', 'actor_park_reward')
     and v_actor_user_id <> p_target_user_id then
    raise exception 'Actor reward can only target the acting user';
  end if;

  if p_event_type in ('author_confirm_bonus', 'author_park_bonus', 'author_invalid_penalty')
      and v_report.report_user_id is distinct from p_target_user_id::text then
    raise exception 'Author reward must target the report author';
  end if;

  if p_event_type in ('author_confirm_bonus', 'author_park_bonus') and v_actor_user_id = p_target_user_id then
    return jsonb_build_object(
      'applied', false,
      'reason', 'self_validation',
      'previous_badges', v_previous_badges
    );
  end if;

  select coalesce(badges, '[]'::jsonb)
  into v_previous_badges
  from public.profiles
  where id = p_target_user_id;

  insert into public.parking_reward_events (
    report_id,
    actor_user_id,
    target_user_id,
    event_type,
    points_delta,
    trust_delta,
    metadata
  )
  values (
    p_report_id,
    v_actor_user_id,
    p_target_user_id,
    p_event_type,
    p_points_delta,
    p_trust_delta,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (report_id, actor_user_id, target_user_id, event_type) do nothing;

  if not found then
    return jsonb_build_object(
      'applied', false,
      'reason', 'duplicate',
      'previous_badges', v_previous_badges
    );
  end if;

  update public.profiles
  set
    points = greatest(0, coalesce(points, 0) + p_points_delta),
    trust_score = greatest(0, least(100, coalesce(trust_score, 0) + p_trust_delta))
  where id = p_target_user_id
  returning to_jsonb(public.profiles.*) into v_updated_profile;

  return jsonb_build_object(
    'applied', true,
    'profile', v_updated_profile,
    'previous_badges', v_previous_badges
  );
end;
$$;

create or replace function public.increment_successful_report_validation(p_report_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parking_reports
  set successful_validation_count = coalesce(successful_validation_count, 0) + 1
  where id = p_report_id;
$$;

grant execute on function public.reward_rank_for_points(integer) to authenticated;
grant execute on function public.get_reward_badge_progress(uuid) to authenticated;
grant execute on function public.sync_reward_profile(uuid) to authenticated;
grant execute on function public.apply_reward_event(uuid, uuid, text, integer, integer, jsonb) to authenticated;
grant execute on function public.increment_successful_report_validation(uuid) to authenticated;