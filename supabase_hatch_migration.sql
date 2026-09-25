-- HATCH live_intents + foundation — run in Supabase SQL Editor
alter table public.profiles add column if not exists terms_accepted boolean default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists phone_verified boolean default false;
alter table public.profiles add column if not exists rep_score integer default 0;
alter table public.profiles add column if not exists college text default 'BMS';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists year int;
alter table public.profiles add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null and username <> '';

create table if not exists public.live_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus_id text default 'BMSCE',
  location_tag text default 'Campus',
  message text not null check (char_length(message) <= 100),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz default now()
);
create index if not exists live_intents_active_idx
  on public.live_intents (expires_at desc);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete cascade,
  leader_id uuid references public.profiles(id),
  status text default 'open',
  members_needed int default 4 check (members_needed between 3 and 4),
  created_at timestamptz default now()
);
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin','member')),
  created_at timestamptz default now(),
  unique(team_id, user_id)
);
create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique(team_id, user_id)
);
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create or replace function public.enforce_team_member_limit()
returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt from public.team_members where team_id = new.team_id;
  if cnt >= 4 then raise exception 'Team is full (max 4 members)'; end if;
  return new;
end;
$$;
drop trigger if exists trg_team_member_limit on public.team_members;
create trigger trg_team_member_limit
  before insert on public.team_members
  for each row execute function public.enforce_team_member_limit();

create or replace function public.accept_team_request(p_request_id uuid, p_admin_id uuid)
returns json language plpgsql security definer as $$
declare r record; cnt int;
begin
  select * into r from public.team_requests where id = p_request_id and status = 'pending';
  if not found then return json_build_object('ok', false, 'error', 'Request not found'); end if;
  if not exists (
    select 1 from public.team_members where team_id = r.team_id and user_id = p_admin_id and role = 'admin'
  ) and not exists (
    select 1 from public.teams where id = r.team_id and owner_id = p_admin_id
  ) then return json_build_object('ok', false, 'error', 'Not admin'); end if;
  select count(*) into cnt from public.team_members where team_id = r.team_id;
  if cnt >= 4 then return json_build_object('ok', false, 'error', 'Team full (max 4)'); end if;
  insert into public.team_members (team_id, user_id, role) values (r.team_id, r.user_id, 'member')
  on conflict (team_id, user_id) do nothing;
  update public.team_requests set status = 'accepted' where id = p_request_id;
  update public.profiles set rep_score = coalesce(rep_score,0) + 5 where id = r.user_id;
  return json_build_object('ok', true);
end;
$$;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Other',
  description text,
  created_by uuid references public.profiles(id),
  club_admin_id uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  body text,
  created_at timestamptz default now()
);
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(club_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create table if not exists public.pulse_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 280),
  category text default 'general',
  is_anonymous boolean default true,
  likes int default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '6 hours')
);

create or replace function public.bump_rep(p_user uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  update public.profiles set rep_score = coalesce(rep_score,0) + p_amount, updated_at = now() where id = p_user;
end;
$$;

alter table public.live_intents enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_requests enable row level security;
alter table public.messages enable row level security;
alter table public.pulse_posts enable row level security;
alter table public.clubs enable row level security;
alter table public.club_posts enable row level security;
alter table public.club_members enable row level security;

drop policy if exists live_intents_select on public.live_intents;
drop policy if exists live_intents_insert on public.live_intents;
drop policy if exists live_intents_delete on public.live_intents;
create policy live_intents_select on public.live_intents for select using (true);
create policy live_intents_insert on public.live_intents for insert with check (auth.uid() = user_id);
create policy live_intents_delete on public.live_intents for delete using (auth.uid() = user_id);

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

drop policy if exists teams_select on public.teams;
drop policy if exists teams_insert on public.teams;
create policy teams_select on public.teams for select using (true);
create policy teams_insert on public.teams for insert with check (auth.uid() = owner_id);

drop policy if exists tm_select on public.team_members;
drop policy if exists tm_insert on public.team_members;
create policy tm_select on public.team_members for select using (true);
create policy tm_insert on public.team_members for insert with check (true);

drop policy if exists tr_all on public.team_requests;
create policy tr_all on public.team_requests for all using (true) with check (true);

drop policy if exists msg_select on public.messages;
drop policy if exists msg_insert on public.messages;
create policy msg_select on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy msg_insert on public.messages for insert with check (auth.uid() = sender_id);

drop policy if exists pulse_select on public.pulse_posts;
drop policy if exists pulse_insert on public.pulse_posts;
create policy pulse_select on public.pulse_posts for select using (true);
create policy pulse_insert on public.pulse_posts for insert with check (auth.uid() = author_id);

drop policy if exists clubs_all on public.clubs;
create policy clubs_all on public.clubs for all using (true) with check (true);
drop policy if exists cposts_all on public.club_posts;
create policy cposts_all on public.club_posts for all using (true) with check (true);
drop policy if exists cm_all on public.club_members;
create policy cm_all on public.club_members for all using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.live_intents;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.team_messages;
exception when duplicate_object then null; end $$;
