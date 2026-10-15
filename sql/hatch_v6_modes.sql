-- Hatch v6 dual-mode schema (Primeora / BMSCE)
-- Run in Supabase SQL editor. Safe to re-run with IF NOT EXISTS patterns.

-- Profiles extensions (existing profiles table)
alter table public.profiles add column if not exists domain_verified boolean default false;
alter table public.profiles add column if not exists hatch_coins integer default 0;
alter table public.profiles add column if not exists productivity_score numeric(5,2) default 0;
alter table public.profiles add column if not exists profile_mode text default 'both';
  check (profile_mode in ('professional','social','both'));

-- Squads (clubs / squad wars)
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  clout_points integer not null default 0,
  rank integer,
  college_pod text default 'bmsce',
  created_at timestamptz default now()
);

-- Events + Pass Drops (Razorpay)
create table if not exists public.hatch_events (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.squads(id) on delete set null,
  title text not null,
  description text,
  pass_limit integer,
  price_paise integer default 0,
  razorpay_order_id text,
  starts_at timestamptz,
  venue text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Calendar / adaptive schedule
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_adaptive boolean default false,
  status text default 'planned' check (status in ('planned','done','skipped','moved')),
  gcal_event_id text,
  source text default 'manual',
  created_at timestamptz default now()
);
create index if not exists calendar_events_user_start on public.calendar_events (user_id, start_time);

-- Attendance margin
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  attended integer not null default 0,
  bunked integer not null default 0,
  total_held integer not null default 0,
  target_pct numeric(5,2) default 85,
  updated_at timestamptz default now(),
  unique (user_id, subject)
);

-- Trip polls (Hatch Escapes)
create table if not exists public.trip_polls (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null,
  year integer not null default extract(year from now())::int,
  destination_options jsonb not null default '[]',
  winning_destination text,
  participants_list jsonb default '[]',
  votes jsonb default '{}',
  status text default 'open',
  created_at timestamptz default now(),
  unique (year, week_number)
);

-- Midnight Run / Night notes (10pm–5am or configured)
create table if not exists public.midnight_feed (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  author_id uuid references auth.users(id) on delete set null,
  content text not null check (char_length(content) between 1 and 280),
  upvotes integer default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists midnight_feed_expires on public.midnight_feed (expires_at desc);

-- Bounties (pro + social)
create table if not exists public.bounties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_coins integer default 0,
  reward_inr_paise integer default 0,
  posted_by uuid references auth.users(id),
  squad_id uuid references public.squads(id),
  status text default 'open',
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Vault / PYQ
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  branch text,
  subject text,
  title text not null,
  kind text default 'notes' check (kind in ('notes','pyq','lab','link')),
  url text,
  upvotes integer default 0,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Focus sessions
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_code text,
  minutes integer not null default 25,
  subject text,
  created_at timestamptz default now()
);

-- App settings keys for windows
insert into public.app_settings (key, value)
values
  ('confession_window_start', '22'),
  ('confession_window_end', '5')
on conflict (key) do nothing;

-- RLS
alter table public.squads enable row level security;
alter table public.hatch_events enable row level security;
alter table public.calendar_events enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.trip_polls enable row level security;
alter table public.midnight_feed enable row level security;
alter table public.bounties enable row level security;
alter table public.vault_items enable row level security;
alter table public.focus_sessions enable row level security;

-- Read policies (authenticated)
do $$ begin
  create policy squads_read on public.squads for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy events_read on public.hatch_events for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy cal_own on public.calendar_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy att_own on public.attendance_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy trip_read on public.trip_polls for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy midnight_read on public.midnight_feed for select to authenticated using (expires_at > now());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy midnight_insert on public.midnight_feed for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy bounty_read on public.bounties for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy vault_read on public.vault_items for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy focus_own on public.focus_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
