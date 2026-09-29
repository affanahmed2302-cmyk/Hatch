create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  requested_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(user_a, user_b)
);
alter table public.connections enable row level security;
drop policy if exists "conn_auth" on public.connections;
create policy "conn_auth" on public.connections for all to authenticated using (true) with check (true);
notify pgrst, 'reload schema';
