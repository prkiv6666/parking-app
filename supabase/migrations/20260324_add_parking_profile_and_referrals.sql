alter table public.profiles
  add column if not exists car_plate text,
  add column if not exists blue_zone_sms_number text,
  add column if not exists green_zone_sms_number text,
  add column if not exists invite_code text,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists referral_redeemed_at timestamptz,
  add column if not exists invite_points_earned integer not null default 0;

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

update public.profiles
set invite_code = public.generate_invite_code()
where invite_code is null or length(trim(invite_code)) = 0;

alter table public.profiles
  alter column invite_code set default public.generate_invite_code();

create unique index if not exists profiles_invite_code_unique
on public.profiles (invite_code);

create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  inviter_points integer not null default 15,
  invited_points integer not null default 10,
  created_at timestamptz not null default now(),
  constraint friend_invites_unique_pair unique (inviter_user_id, invited_user_id),
  constraint friend_invites_no_self_invite check (inviter_user_id <> invited_user_id)
);

alter table public.friend_invites enable row level security;

drop policy if exists "friend_invites_select_own" on public.friend_invites;
create policy "friend_invites_select_own"
on public.friend_invites
for select
to authenticated
using (inviter_user_id = auth.uid() or invited_user_id = auth.uid());

create or replace function public.redeem_invite_code(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_inviter public.profiles%rowtype;
  v_actor public.profiles%rowtype;
begin
  if v_actor_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_actor
  from public.profiles
  where id = v_actor_user_id
  for update;

  if not found then
    raise exception 'Current profile not found';
  end if;

  if v_actor.referred_by is not null then
    return jsonb_build_object(
      'applied', false,
      'reason', 'already_referred'
    );
  end if;

  select *
  into v_inviter
  from public.profiles
  where upper(invite_code) = upper(trim(p_invite_code))
  for update;

  if not found then
    return jsonb_build_object(
      'applied', false,
      'reason', 'invalid_code'
    );
  end if;

  if v_inviter.id = v_actor_user_id then
    return jsonb_build_object(
      'applied', false,
      'reason', 'self_invite'
    );
  end if;

  insert into public.friend_invites (
    inviter_user_id,
    invited_user_id,
    inviter_points,
    invited_points
  )
  values (
    v_inviter.id,
    v_actor_user_id,
    15,
    10
  )
  on conflict (inviter_user_id, invited_user_id) do nothing;

  if not found then
    return jsonb_build_object(
      'applied', false,
      'reason', 'duplicate'
    );
  end if;

  update public.profiles
  set
    referred_by = v_inviter.id,
    referral_redeemed_at = now(),
    points = greatest(0, coalesce(points, 0) + 10),
    trust_score = greatest(0, least(100, coalesce(trust_score, 0) + 2))
  where id = v_actor_user_id;

  update public.profiles
  set
    points = greatest(0, coalesce(points, 0) + 15),
    trust_score = greatest(0, least(100, coalesce(trust_score, 0) + 3)),
    invite_points_earned = coalesce(invite_points_earned, 0) + 15
  where id = v_inviter.id;

  perform public.sync_reward_profile(v_actor_user_id);
  perform public.sync_reward_profile(v_inviter.id);

  return jsonb_build_object(
    'applied', true,
    'inviter_user_id', v_inviter.id,
    'inviter_points', 15,
    'invited_points', 10
  );
end;
$$;

grant execute on function public.generate_invite_code() to authenticated;
grant execute on function public.redeem_invite_code(text) to authenticated;