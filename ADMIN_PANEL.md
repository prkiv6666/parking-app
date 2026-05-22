# ParkRadar Admin Panel

The web admin panel lives at:

`https://park-radar.app/#/admin`

Local dev:

`http://localhost:5173/#/admin`

## What it can do

- Sign in with Supabase email/password.
- Check admin access through `public.admin_users`.
- Add and edit partner businesses by `slug`.
- Hide/show partner businesses without deleting them.
- View and update feedback status.
- View wrong/fake report flags.
- View crash/error logs.

## Setup

Run these migrations in Supabase SQL Editor in this order:

1. `supabase/migrations/20260521_add_launch_readiness_tables.sql`
2. `supabase/migrations/20260521_add_partner_businesses.sql`
3. `supabase/migrations/20260522_add_admin_panel_access.sql`

Then add your own Supabase Auth user as admin:

```sql
select id, email
from auth.users
order by created_at desc;
```

Copy your user id and run:

```sql
insert into public.admin_users (user_id, role)
values ('YOUR_AUTH_USER_ID_HERE', 'owner')
on conflict (user_id) do update
set role = excluded.role;
```

Never put the Supabase service role key in the website. The admin panel uses the normal anon key plus RLS policies.
