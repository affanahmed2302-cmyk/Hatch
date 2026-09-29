-- HATCH v2: safety + obsession + analytics
alter table public.profiles add column if not exists is_verified boolean default false;
alter table public.profiles add column if not exists invite_code text;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_type text;
alter table public.pulse_posts add column if not exists likes int default 0;

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text default 'open',
  created_at timestamptz default now()
);
create table if not exists public.close_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);
create table if not exists public.pulse_likes (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid not null references public.pulse_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(pulse_id, user_id)
);
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  props jsonb default '{}',
  created_at timestamptz default now()
);
create table if not exists public.campus_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text default 'hackathon',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  link text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

do $$ begin
  alter table public.blocks enable row level security;
  alter table public.reports enable row level security;
  alter table public.close_friends enable row level security;
  alter table public.message_reactions enable row level security;
  alter table public.pulse_likes enable row level security;
  alter table public.analytics_events enable row level security;
  alter table public.campus_events enable row level security;
exception when others then null; end $$;

drop policy if exists "blocks_all" on public.blocks;
create policy "blocks_all" on public.blocks for all to authenticated using (true) with check (true);
drop policy if exists "reports_all" on public.reports;
create policy "reports_all" on public.reports for all to authenticated using (true) with check (true);
drop policy if exists "cf_all" on public.close_friends;
create policy "cf_all" on public.close_friends for all to authenticated using (true) with check (true);
drop policy if exists "mr_all" on public.message_reactions;
create policy "mr_all" on public.message_reactions for all to authenticated using (true) with check (true);
drop policy if exists "pl_all" on public.pulse_likes;
create policy "pl_all" on public.pulse_likes for all to authenticated using (true) with check (true);
drop policy if exists "ae_all" on public.analytics_events;
create policy "ae_all" on public.analytics_events for all to authenticated using (true) with check (true);
drop policy if exists "ce_all" on public.campus_events;
create policy "ce_all" on public.campus_events for all to authenticated using (true) with check (true);

insert into public.campus_events (title, kind, starts_at, location)
select 'BMS Hack Night', 'hackathon', now() + interval '14 days', 'Innovation Lab'
where not exists (select 1 from public.campus_events limit 1);

create or replace function public.bump_rep(p_user uuid, p_amount int default 1)
returns void language plpgsql security definer as $$
begin
  update public.profiles set rep_score = coalesce(rep_score, 0) + p_amount where id = p_user;
end;
$$;

notify pgrst, 'reload schema';
