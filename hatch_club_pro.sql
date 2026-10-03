-- Professional club boards — only super-admin creates clubs
-- Club admins post notices/media/polls; members react with emoji only

create table if not exists public.campus_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  category text default 'general',
  cover_url text,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.club_admins (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.campus_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'admin',
  created_at timestamptz default now(),
  unique (club_id, user_id)
);

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.campus_clubs(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  post_type text default 'notice',
  title text,
  body text,
  media_url text,
  link_url text,
  poll_options jsonb,
  created_at timestamptz default now()
);

create table if not exists public.club_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.club_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (post_id, user_id, emoji)
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  note text,
  granted_by uuid,
  created_at timestamptz default now(),
  unique (user_id, badge)
);

alter table public.campus_clubs enable row level security;
alter table public.club_admins enable row level security;
alter table public.club_posts enable row level security;
alter table public.club_reactions enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "clubs read" on public.campus_clubs;
create policy "clubs read" on public.campus_clubs for select to authenticated using (true);
drop policy if exists "clubs write auth" on public.campus_clubs;
create policy "clubs write auth" on public.campus_clubs for all to authenticated using (true) with check (true);

drop policy if exists "club admins all" on public.club_admins;
create policy "club admins all" on public.club_admins for all to authenticated using (true) with check (true);

drop policy if exists "club posts all" on public.club_posts;
create policy "club posts all" on public.club_posts for all to authenticated using (true) with check (true);

drop policy if exists "club reactions all" on public.club_reactions;
create policy "club reactions all" on public.club_reactions for all to authenticated using (true) with check (true);

drop policy if exists "badges all" on public.user_badges;
create policy "badges all" on public.user_badges for all to authenticated using (true) with check (true);
