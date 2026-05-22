create table if not exists public.partner_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('car_wash', 'tires', 'detailing', 'service')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text not null,
  phone text not null default '',
  discount text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_businesses_active_idx
on public.partner_businesses (is_active, sort_order, name);

alter table public.partner_businesses enable row level security;

drop policy if exists "Anyone can view active partner businesses" on public.partner_businesses;

create policy "Anyone can view active partner businesses"
on public.partner_businesses
for select
to anon, authenticated
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

grant select on public.partner_businesses to anon, authenticated;

create or replace function public.set_partner_businesses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_businesses_updated_at on public.partner_businesses;

create trigger set_partner_businesses_updated_at
before update on public.partner_businesses
for each row
execute function public.set_partner_businesses_updated_at();

insert into public.partner_businesses (
  slug,
  name,
  type,
  latitude,
  longitude,
  address,
  phone,
  is_active,
  sort_order
)
values (
  'golyamata-guma-varna',
  'Голямата гума Варна',
  'tires',
  43.2273899,
  27.8866134,
  'бул. „Сливница“ 178, ж.к. Младост II, 9020 Варна',
  '0884 955 441',
  true,
  10
),
(
  'autosense-spa-varna',
  'AutoSense & Spa Varna',
  'detailing',
  43.2173398,
  27.8984633,
  'ул. „Академик Андрей Сахаров“ 2, Grand Mall Варна, ниво -1',
  '0882 111 211',
  true,
  20
)
on conflict (slug) do update
set
  name = excluded.name,
  type = excluded.type,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  address = excluded.address,
  phone = excluded.phone,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
