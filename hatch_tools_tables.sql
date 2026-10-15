-- Optional tables for Tools hub features (safe to re-run)

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  link text,
  tags text[] default '{}',
  source text default 'student',
  posted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.opportunities enable row level security;
drop policy if exists "opp_select" on public.opportunities;
create policy "opp_select" on public.opportunities for select to authenticated using (true);
drop policy if exists "opp_insert" on public.opportunities;
create policy "opp_insert" on public.opportunities for insert to authenticated with check (auth.uid() = posted_by);

create table if not exists public.lost_found (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lost','found')),
  title text not null,
  place text,
  note text,
  author_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.lost_found enable row level security;
drop policy if exists "lf_select" on public.lost_found;
create policy "lf_select" on public.lost_found for select to authenticated using (true);
drop policy if exists "lf_insert" on public.lost_found;
create policy "lf_insert" on public.lost_found for insert to authenticated with check (auth.uid() = author_id);

create table if not exists public.peer_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  subject text,
  author_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.peer_notes enable row level security;
drop policy if exists "pn_select" on public.peer_notes;
create policy "pn_select" on public.peer_notes for select to authenticated using (true);
drop policy if exists "pn_insert" on public.peer_notes;
create policy "pn_insert" on public.peer_notes for insert to authenticated with check (auth.uid() = author_id);
