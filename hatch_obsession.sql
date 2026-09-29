-- Obsession features schema
alter table public.messages add column if not exists read_at timestamptz;
alter table public.profiles add column if not exists last_seen timestamptz default now();
alter table public.profiles add column if not exists is_online boolean default false;
alter table public.profiles add column if not exists chat_streak int default 0;
alter table public.profiles add column if not exists vibe_streak int default 0;
alter table public.profiles add column if not exists last_vibe_date date;
alter table public.profiles add column if not exists rep_score int default 0;

create table if not exists public.chat_streaks (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  streak_count int default 1,
  last_message_date date not null default (timezone('Asia/Kolkata', now()))::date,
  unique(user_a, user_b)
);

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists profile_views_viewed_idx on public.profile_views(viewed_id, created_at desc);

create table if not exists public.saved_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, saved_id)
);

create table if not exists public.status_bubbles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  zone text default 'Campus',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

create table if not exists public.free_now (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place text not null default 'Library',
  note text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz default now()
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null default (timezone('Asia/Kolkata', now()))::date,
  connects int default 0,
  messages int default 0,
  views_received int default 0,
  unique(user_id, activity_date)
);

do $$ begin
  alter table public.chat_streaks enable row level security;
  alter table public.profile_views enable row level security;
  alter table public.saved_profiles enable row level security;
  alter table public.status_bubbles enable row level security;
  alter table public.free_now enable row level security;
  alter table public.daily_activity enable row level security;
exception when others then null; end $$;

drop policy if exists "cs_all" on public.chat_streaks;
create policy "cs_all" on public.chat_streaks for all to authenticated using (true) with check (true);
drop policy if exists "pv_all" on public.profile_views;
create policy "pv_all" on public.profile_views for all to authenticated using (true) with check (true);
drop policy if exists "sp_all" on public.saved_profiles;
create policy "sp_all" on public.saved_profiles for all to authenticated using (true) with check (true);
drop policy if exists "sb_all" on public.status_bubbles;
create policy "sb_all" on public.status_bubbles for all to authenticated using (true) with check (true);
drop policy if exists "fn_all" on public.free_now;
create policy "fn_all" on public.free_now for all to authenticated using (true) with check (true);
drop policy if exists "da_all" on public.daily_activity;
create policy "da_all" on public.daily_activity for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
