-- Certificates + safer connection status + profile_views ensure
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  issuer text,
  url text,
  created_at timestamptz default now()
);
alter table public.certificates enable row level security;
drop policy if exists "certs_read" on public.certificates;
create policy "certs_read" on public.certificates for select to authenticated using (true);
drop policy if exists "certs_own" on public.certificates;
create policy "certs_own" on public.certificates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid references public.profiles(id) on delete cascade,
  viewed_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.profile_views enable row level security;
drop policy if exists "views_auth" on public.profile_views;
create policy "views_auth" on public.profile_views for all to authenticated using (true) with check (true);

-- allow rejected status if constrained
do $$ begin
  alter table public.connections drop constraint if exists connections_status_check;
exception when others then null;
end $$;

notify pgrst, 'reload schema';
