-- Sister apps schema + kill-switches (NO $$ blocks — safe phone paste)
-- Aligns dating + club portal with admin feature flags

-- Feature flags (canonical keys)
create table if not exists public.app_settings (
  key text primary key,
  value text not null default 'true',
  updated_at timestamptz default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
drop policy if exists "settings read auth" on public.app_settings;
create policy "settings read auth" on public.app_settings for select to authenticated using (true);
drop policy if exists "settings write auth" on public.app_settings;
create policy "settings write auth" on public.app_settings for all to authenticated using (true) with check (true);

insert into public.app_settings (key, value) values
  ('feature_sparks', 'false'),
  ('dating_app_active', 'false'),
  ('feature_club_portal', 'true'),
  ('feature_bounties', 'true'),
  ('feature_lounge', 'true'),
  ('feature_premium', 'true'),
  ('feature_ecosystem', 'true'),
  ('feature_club_events', 'true'),
  ('maintenance_mode', 'false')
on conflict (key) do nothing;

-- Sister App 1: Dating profiles + matches (sparks_* is the live implementation)
create table if not exists public.sparks_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text,
  vibe text,
  looking_for text,
  prompts text,
  is_visible boolean default true,
  consent_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.sparks_profiles add column if not exists prompts text;
alter table public.sparks_profiles enable row level security;
drop policy if exists "sparks read" on public.sparks_profiles;
create policy "sparks read" on public.sparks_profiles for select to authenticated using (is_visible = true or auth.uid() = user_id);
drop policy if exists "sparks upsert" on public.sparks_profiles;
create policy "sparks upsert" on public.sparks_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "sparks update" on public.sparks_profiles;
create policy "sparks update" on public.sparks_profiles for update to authenticated using (auth.uid() = user_id);

create table if not exists public.sparks_likes (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  liked boolean not null default true,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);
create index if not exists idx_sparks_likes_to on public.sparks_likes (to_id);
alter table public.sparks_likes enable row level security;
drop policy if exists "sparks_likes read own" on public.sparks_likes;
create policy "sparks_likes read own" on public.sparks_likes for select to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
drop policy if exists "sparks_likes insert own" on public.sparks_likes;
create policy "sparks_likes insert own" on public.sparks_likes for insert to authenticated with check (auth.uid() = from_id);
drop policy if exists "sparks_likes update own" on public.sparks_likes;
create policy "sparks_likes update own" on public.sparks_likes for update to authenticated using (auth.uid() = from_id);

-- Sister App 2: Club events + core
create table if not exists public.club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  event_at timestamptz,
  venue text,
  budget_inr int default 0,
  publish_to_feed boolean default true,
  status text default 'published',
  created_at timestamptz default now()
);
create index if not exists idx_club_events_created on public.club_events (created_at desc);
alter table public.club_events enable row level security;
drop policy if exists "club_events read" on public.club_events;
create policy "club_events read" on public.club_events for select to authenticated using (true);
drop policy if exists "club_events insert" on public.club_events;
create policy "club_events insert" on public.club_events for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "club_events update own" on public.club_events;
create policy "club_events update own" on public.club_events for update to authenticated using (auth.uid() = created_by);

create table if not exists public.club_core (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_name text not null,
  role text default 'core',
  verified boolean default false,
  created_at timestamptz default now(),
  unique (user_id, club_name)
);
alter table public.club_core enable row level security;
drop policy if exists "club_core read" on public.club_core;
create policy "club_core read" on public.club_core for select to authenticated using (true);
drop policy if exists "club_core insert" on public.club_core;
create policy "club_core insert" on public.club_core for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "club_core update" on public.club_core;
create policy "club_core update" on public.club_core for update to authenticated using (true);
