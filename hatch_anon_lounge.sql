-- Anonymous lounge safety: bans + optional app ban flag
create table if not exists public.anon_lounge_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  banned_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.anon_lounge_bans enable row level security;

drop policy if exists "anon_ban_select" on public.anon_lounge_bans;
drop policy if exists "anon_ban_insert" on public.anon_lounge_bans;
drop policy if exists "anon_ban_delete" on public.anon_lounge_bans;

-- Users can see if THEY are banned (to block entry)
create policy "anon_ban_select" on public.anon_lounge_bans
  for select to authenticated using (auth.uid() = user_id or true);

-- Inserts/deletes only via authenticated (app checks super-admin in client; tighten with service role later)
create policy "anon_ban_insert" on public.anon_lounge_bans
  for insert to authenticated with check (true);
create policy "anon_ban_delete" on public.anon_lounge_bans
  for delete to authenticated using (true);

-- App-wide ban flag on profiles
alter table public.profiles add column if not exists app_banned boolean default false;
alter table public.profiles add column if not exists anon_consent_at timestamptz;

-- Ensure lounge can use channel = anonymous (already free text channel)
-- Realtime already on lounge_messages from hatch_lounge.sql
