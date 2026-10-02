-- Midnight confessions 12-3 + directed anonymous crush flow

create table if not exists public.midnight_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  kind text default 'confession',
  drop_night text,
  created_at timestamptz default now()
);
alter table public.midnight_drops enable row level security;
drop policy if exists "mdrops read" on public.midnight_drops;
create policy "mdrops read" on public.midnight_drops for select to authenticated using (true);
drop policy if exists "mdrops insert" on public.midnight_drops;
create policy "mdrops insert" on public.midnight_drops for insert to authenticated with check (auth.uid() = user_id);

-- Directed: confess ABOUT someone without revealing identity until mutual
create table if not exists public.secret_confessions (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  from_revealed boolean default false,
  to_interested boolean default false,
  to_revealed boolean default false,
  status text default 'pending',
  night_key text,
  created_at timestamptz default now()
);
create index if not exists idx_secret_to on public.secret_confessions (to_id, status);
alter table public.secret_confessions enable row level security;
drop policy if exists "secret read" on public.secret_confessions;
create policy "secret read" on public.secret_confessions for select to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
drop policy if exists "secret insert" on public.secret_confessions;
create policy "secret insert" on public.secret_confessions for insert to authenticated with check (auth.uid() = from_id);
drop policy if exists "secret update" on public.secret_confessions;
create policy "secret update" on public.secret_confessions for update to authenticated using (auth.uid() = from_id or auth.uid() = to_id);
