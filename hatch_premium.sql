-- Premium memberships + payment requests (manual UPI approval)
alter table public.profiles add column if not exists is_public boolean default true;
alter table public.profiles add column if not exists premium_until timestamptz;
alter table public.profiles add column if not exists is_premium boolean default false;

create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('1m', '3m')),
  amount_inr int not null,
  upi_ref text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists premium_requests_status_idx on public.premium_requests(status, created_at desc);
create index if not exists premium_requests_user_idx on public.premium_requests(user_id, created_at desc);

alter table public.premium_requests enable row level security;

drop policy if exists "pr_select_own" on public.premium_requests;
create policy "pr_select_own" on public.premium_requests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "pr_insert_own" on public.premium_requests;
create policy "pr_insert_own" on public.premium_requests
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "pr_select_all_auth" on public.premium_requests;
create policy "pr_select_all_auth" on public.premium_requests
  for select to authenticated using (true);

drop policy if exists "pr_update_auth" on public.premium_requests;
create policy "pr_update_auth" on public.premium_requests
  for update to authenticated using (true) with check (true);

create table if not exists public.circle_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  vibe text,
  looking_for text,
  is_visible boolean default true,
  updated_at timestamptz default now()
);

alter table public.circle_profiles enable row level security;
drop policy if exists "cp_all" on public.circle_profiles;
create policy "cp_all" on public.circle_profiles for all to authenticated using (true) with check (true);
