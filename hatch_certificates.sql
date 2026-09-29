-- Certificates for public profiles + strength
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  issuer text,
  url text,
  issued_at date,
  created_at timestamptz default now()
);

create index if not exists certificates_user_idx on public.certificates(user_id, created_at desc);

do $$ begin
  alter table public.certificates enable row level security;
exception when others then null; end $$;

drop policy if exists "certs_select" on public.certificates;
create policy "certs_select" on public.certificates for select to authenticated using (true);

drop policy if exists "certs_insert" on public.certificates;
create policy "certs_insert" on public.certificates for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "certs_update" on public.certificates;
create policy "certs_update" on public.certificates for update to authenticated using (auth.uid() = user_id);

drop policy if exists "certs_delete" on public.certificates;
create policy "certs_delete" on public.certificates for delete to authenticated using (auth.uid() = user_id);

-- Ensure free_now exists (from obsession)
create table if not exists public.free_now (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place text not null default 'Library',
  note text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz default now()
);

create index if not exists free_now_expires_idx on public.free_now(expires_at desc);

do $$ begin
  alter table public.free_now enable row level security;
exception when others then null; end $$;

drop policy if exists "fn_all" on public.free_now;
create policy "fn_all" on public.free_now for all to authenticated using (true) with check (true);
