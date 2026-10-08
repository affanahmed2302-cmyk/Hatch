-- Pulse replies + daily nudge flag
create table if not exists public.pulse_replies (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid not null references public.pulse_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists pulse_replies_pulse_idx on public.pulse_replies (pulse_id, created_at desc);

alter table public.pulse_replies enable row level security;

drop policy if exists "pulse_replies_select" on public.pulse_replies;
drop policy if exists "pulse_replies_insert" on public.pulse_replies;
drop policy if exists "pulse_replies_delete" on public.pulse_replies;

create policy "pulse_replies_select" on public.pulse_replies
  for select to authenticated using (true);

create policy "pulse_replies_insert" on public.pulse_replies
  for insert to authenticated with check (auth.uid() = author_id);

create policy "pulse_replies_delete" on public.pulse_replies
  for delete to authenticated using (auth.uid() = author_id);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists daily_nudge boolean default true;
alter table public.profiles add column if not exists last_daily_nudge_at timestamptz;
