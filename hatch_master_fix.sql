-- HATCH master schema — run once in Supabase SQL Editor
alter table public.profiles add column if not exists career_goal text;
alter table public.profiles add column if not exists intent text;
alter table public.profiles add column if not exists availability text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists github_handle text;
alter table public.profiles add column if not exists leetcode_handle text;
alter table public.profiles add column if not exists tech_stack text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists year int;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] default '{}';
alter table public.profiles add column if not exists rep_score int default 0;
alter table public.profiles add column if not exists terms_accepted boolean default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists last_seen timestamptz default now();
alter table public.profiles add column if not exists is_online boolean default false;
alter table public.profiles add column if not exists college text default 'BMS';

create table if not exists public.live_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus_id text default 'BMSCE',
  location_tag text default 'Campus',
  message text not null,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz default now()
);
create table if not exists public.vibe_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  zone text not null,
  check_date date not null default (timezone('Asia/Kolkata', now()))::date,
  created_at timestamptz default now(),
  unique(user_id, check_date)
);
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
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  requested_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(user_a, user_b)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  room_id text not null,
  call_type text not null default 'video' check (call_type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','rejected','ended','missed')),
  created_at timestamptz default now()
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  members_needed int default 4,
  created_at timestamptz default now()
);
alter table public.teams add column if not exists members_needed int default 4;
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(team_id, user_id)
);
create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now()
);
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Other',
  description text,
  created_by uuid references public.profiles(id),
  club_admin_id uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(club_id, user_id)
);
create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  body text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;
alter table public.connections enable row level security;
alter table public.live_intents enable row level security;
alter table public.pulse_posts enable row level security;

drop policy if exists "profiles_auth" on public.profiles;
create policy "profiles_auth" on public.profiles for all to authenticated using (true) with check (true);
drop policy if exists "msg_auth" on public.messages;
create policy "msg_auth" on public.messages for all to authenticated using (true) with check (true);
drop policy if exists "calls_auth" on public.calls;
create policy "calls_auth" on public.calls for all to authenticated using (true) with check (true);
drop policy if exists "conn_auth" on public.connections;
create policy "conn_auth" on public.connections for all to authenticated using (true) with check (true);
drop policy if exists "li_auth" on public.live_intents;
create policy "li_auth" on public.live_intents for all to authenticated using (true) with check (true);
drop policy if exists "pulse_auth" on public.pulse_posts;
create policy "pulse_auth" on public.pulse_posts for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
