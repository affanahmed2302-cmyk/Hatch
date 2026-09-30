-- Sparks dating + clubs HQ tables (no $$ blocks — safe phone paste)

create table if not exists public.sparks_likes (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  liked boolean not null default true,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);
create index if not exists idx_sparks_likes_to on public.sparks_likes (to_id);
create index if not exists idx_sparks_likes_from on public.sparks_likes (from_id);
alter table public.sparks_likes enable row level security;
drop policy if exists "sparks_likes read own" on public.sparks_likes;
create policy "sparks_likes read own" on public.sparks_likes for select to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
drop policy if exists "sparks_likes insert own" on public.sparks_likes;
create policy "sparks_likes insert own" on public.sparks_likes for insert to authenticated with check (auth.uid() = from_id);
drop policy if exists "sparks_likes update own" on public.sparks_likes;
create policy "sparks_likes update own" on public.sparks_likes for update to authenticated using (auth.uid() = from_id);

-- Ensure sparks_profiles exists
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

-- Clubs table safety (if missing)
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Other',
  description text,
  created_by uuid,
  club_admin_id uuid,
  created_at timestamptz default now()
);
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (club_id, user_id)
);
alter table public.clubs enable row level security;
drop policy if exists "clubs read" on public.clubs;
create policy "clubs read" on public.clubs for select to authenticated using (true);
drop policy if exists "clubs insert auth" on public.clubs;
create policy "clubs insert auth" on public.clubs for insert to authenticated with check (true);
drop policy if exists "clubs update auth" on public.clubs;
create policy "clubs update auth" on public.clubs for update to authenticated using (true);
drop policy if exists "clubs delete auth" on public.clubs;
create policy "clubs delete auth" on public.clubs for delete to authenticated using (true);
alter table public.club_members enable row level security;
drop policy if exists "cm read" on public.club_members;
create policy "cm read" on public.club_members for select to authenticated using (true);
drop policy if exists "cm write" on public.club_members;
create policy "cm write" on public.club_members for all to authenticated using (true) with check (true);
