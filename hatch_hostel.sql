-- Hatch Hostel module
create table if not exists public.hostel_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  living_type text not null default 'hostel',
  campus text default 'BMSCE',
  locality text,
  place_name text,
  budget text,
  food_pref text,
  share_pref text,
  priorities text[] default '{}',
  onboarded_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.hostel_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  body text not null,
  locality text,
  budget text,
  status text not null default 'open',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists hostel_requests_open_idx on public.hostel_requests (status, expires_at desc);

create table if not exists public.hostel_request_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.hostel_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hostel_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'sale',
  price text,
  category text default 'general',
  status text not null default 'available',
  created_at timestamptz not null default now()
);
create index if not exists hostel_listings_status_idx on public.hostel_listings (status, created_at desc);

create table if not exists public.hostel_tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tag text default 'general',
  locality text,
  created_at timestamptz not null default now()
);

alter table public.hostel_profiles enable row level security;
alter table public.hostel_requests enable row level security;
alter table public.hostel_request_replies enable row level security;
alter table public.hostel_listings enable row level security;
alter table public.hostel_tips enable row level security;

drop policy if exists "hostel_profiles_all_own" on public.hostel_profiles;
create policy "hostel_profiles_all_own" on public.hostel_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "hostel_requests_select" on public.hostel_requests;
drop policy if exists "hostel_requests_insert" on public.hostel_requests;
drop policy if exists "hostel_requests_update" on public.hostel_requests;
create policy "hostel_requests_select" on public.hostel_requests for select to authenticated using (true);
create policy "hostel_requests_insert" on public.hostel_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "hostel_requests_update" on public.hostel_requests for update to authenticated using (auth.uid() = user_id);

drop policy if exists "hostel_replies_select" on public.hostel_request_replies;
drop policy if exists "hostel_replies_insert" on public.hostel_request_replies;
create policy "hostel_replies_select" on public.hostel_request_replies for select to authenticated using (true);
create policy "hostel_replies_insert" on public.hostel_request_replies for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "hostel_listings_select" on public.hostel_listings;
drop policy if exists "hostel_listings_insert" on public.hostel_listings;
drop policy if exists "hostel_listings_update" on public.hostel_listings;
create policy "hostel_listings_select" on public.hostel_listings for select to authenticated using (true);
create policy "hostel_listings_insert" on public.hostel_listings for insert to authenticated with check (auth.uid() = user_id);
create policy "hostel_listings_update" on public.hostel_listings for update to authenticated using (auth.uid() = user_id);

drop policy if exists "hostel_tips_select" on public.hostel_tips;
drop policy if exists "hostel_tips_insert" on public.hostel_tips;
create policy "hostel_tips_select" on public.hostel_tips for select to authenticated using (true);
create policy "hostel_tips_insert" on public.hostel_tips for insert to authenticated with check (auth.uid() = user_id);
