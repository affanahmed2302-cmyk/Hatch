-- Hatch growth schema (NO dollar-quote blocks — safe to paste on phone)
-- Fixed: lounge_messages uses sender_id

-- 1) Profile columns
alter table public.profiles add column if not exists college_pod text default 'bmsce';
alter table public.profiles add column if not exists college_domain text;
alter table public.profiles add column if not exists referred_by text;
alter table public.profiles add column if not exists open_streak int default 0;
alter table public.profiles add column if not exists last_open_date date;

create index if not exists idx_profiles_college_pod on public.profiles (college_pod);
create index if not exists idx_profiles_rep on public.profiles (rep_score desc nulls last);

-- 2) Vibe checks
create table if not exists public.vibe_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (current_date),
  choice text not null,
  created_at timestamptz default now(),
  unique (user_id, day)
);
alter table public.vibe_checks enable row level security;
drop policy if exists "vibe read" on public.vibe_checks;
create policy "vibe read" on public.vibe_checks for select to authenticated using (true);
drop policy if exists "vibe insert own" on public.vibe_checks;
create policy "vibe insert own" on public.vibe_checks for insert to authenticated with check (auth.uid() = user_id);

-- 3) Study beacons
create table if not exists public.study_beacons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place text not null,
  note text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_study_beacons_exp on public.study_beacons (expires_at desc);
alter table public.study_beacons enable row level security;
drop policy if exists "beacon read" on public.study_beacons;
create policy "beacon read" on public.study_beacons for select to authenticated using (expires_at > now());
drop policy if exists "beacon upsert own" on public.study_beacons;
create policy "beacon upsert own" on public.study_beacons for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "beacon delete own" on public.study_beacons;
create policy "beacon delete own" on public.study_beacons for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "beacon update own" on public.study_beacons;
create policy "beacon update own" on public.study_beacons for update to authenticated using (auth.uid() = user_id);

-- 4) Micro bounties
create table if not exists public.micro_bounties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  reward_inr int default 0,
  status text default 'open',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_bounties_open on public.micro_bounties (status, expires_at desc);
alter table public.micro_bounties enable row level security;
drop policy if exists "bounty read" on public.micro_bounties;
create policy "bounty read" on public.micro_bounties for select to authenticated using (true);
drop policy if exists "bounty insert own" on public.micro_bounties;
create policy "bounty insert own" on public.micro_bounties for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "bounty update own" on public.micro_bounties;
create policy "bounty update own" on public.micro_bounties for update to authenticated using (auth.uid() = user_id);

-- 5) Referrals
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists idx_referrals_code on public.referrals (code);
alter table public.referrals enable row level security;
drop policy if exists "ref read own" on public.referrals;
create policy "ref read own" on public.referrals for select to authenticated using (auth.uid() = inviter_id or auth.uid() = invitee_id);
drop policy if exists "ref insert" on public.referrals;
create policy "ref insert" on public.referrals for insert to authenticated with check (auth.uid() = inviter_id);

-- 6) Profiles RLS
alter table public.profiles enable row level security;
drop policy if exists "profiles select auth" on public.profiles;
create policy "profiles select auth" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- 7) Lounge RLS (column is sender_id)
alter table public.lounge_messages enable row level security;
drop policy if exists "lounge read" on public.lounge_messages;
drop policy if exists "lounge_select" on public.lounge_messages;
create policy "lounge_select" on public.lounge_messages for select to authenticated using (true);
drop policy if exists "lounge insert" on public.lounge_messages;
drop policy if exists "lounge_insert" on public.lounge_messages;
create policy "lounge_insert" on public.lounge_messages for insert to authenticated with check (auth.uid() = sender_id);
drop policy if exists "lounge_delete_own" on public.lounge_messages;
create policy "lounge_delete_own" on public.lounge_messages for delete to authenticated using (auth.uid() = sender_id);

-- 8) Pulse RLS
alter table public.pulse_posts enable row level security;
drop policy if exists "pulse read" on public.pulse_posts;
create policy "pulse read" on public.pulse_posts for select to authenticated using (true);
drop policy if exists "pulse insert" on public.pulse_posts;
create policy "pulse insert" on public.pulse_posts for insert to authenticated with check (auth.uid() = author_id);
