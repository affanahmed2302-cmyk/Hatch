# pulse_posts column name

**Error:** `Could not find the 'user_id' column of 'pulse_posts' in the schema cache`

**Cause:** Table was created with `author_id`, but the app inserted `user_id`.

**Fix (code):** `postPulse` / `deletePulse` now use `author_id` (deployed on stable-plus).

**Optional DB check** (Supabase SQL editor):

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'pulse_posts';

-- If table is missing entirely:
create table if not exists public.pulse_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  category text default 'general',
  is_anonymous boolean default true,
  likes int default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '6 hours')
);
alter table public.pulse_posts enable row level security;
drop policy if exists pulse_select on public.pulse_posts;
drop policy if exists pulse_insert on public.pulse_posts;
create policy pulse_select on public.pulse_posts for select using (true);
create policy pulse_insert on public.pulse_posts for insert with check (auth.uid() = author_id);
notify pgrst, 'reload schema';
```

After any schema change, run `notify pgrst, 'reload schema';` or restart the API in Supabase.
