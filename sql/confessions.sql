-- Anonymous night notes
create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  content text not null check (char_length(content) between 1 and 280),
  is_anonymous boolean default true,
  created_at timestamptz default now()
);
alter table public.confessions enable row level security;
drop policy if exists "read confessions" on public.confessions;
drop policy if exists "insert confessions" on public.confessions;
create policy "read confessions" on public.confessions for select to authenticated using (true);
create policy "insert confessions" on public.confessions for insert to authenticated with check (auth.uid() = author_id);
