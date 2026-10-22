-- Align connections schema with app (user_id / target_id) + tighter RLS
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique(user_id, target_id)
);
create index if not exists connections_user_id_idx on public.connections(user_id);
create index if not exists connections_target_id_idx on public.connections(target_id);
alter table public.connections enable row level security;
drop policy if exists "conn_all" on public.connections;
drop policy if exists "conn_select_own" on public.connections;
drop policy if exists "conn_insert_own" on public.connections;
drop policy if exists "conn_update_party" on public.connections;
drop policy if exists "conn_delete_party" on public.connections;
create policy "conn_select_own" on public.connections for select to authenticated using (auth.uid() = user_id or auth.uid() = target_id);
create policy "conn_insert_own" on public.connections for insert to authenticated with check (auth.uid() = user_id and user_id <> target_id);
create policy "conn_update_party" on public.connections for update to authenticated using (auth.uid() = user_id or auth.uid() = target_id) with check (auth.uid() = user_id or auth.uid() = target_id);
create policy "conn_delete_party" on public.connections for delete to authenticated using (auth.uid() = user_id or auth.uid() = target_id);
notify pgrst, 'reload schema';
