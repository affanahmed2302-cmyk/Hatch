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

create policy "anon_ban_select" on public.anon_lounge_bans
  for select to authenticated using (auth.uid() = user_id or true);

create policy "anon_ban_insert" on public.anon_lounge_bans
  for insert to authenticated with check (true);
create policy "anon_ban_delete" on public.anon_lounge_bans
  for delete to authenticated using (true);

alter table public.profiles add column if not exists app_banned boolean default false;
alter table public.profiles add column if not exists anon_consent_at timestamptz;
