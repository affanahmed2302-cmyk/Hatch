-- Hatch Schedule Planner: classes, goals, activities
create extension if not exists pgcrypto;

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('class', 'activity', 'goal')),
  title text not null check (char_length(title) between 1 and 120),
  subtitle text,
  location text,
  -- weekly recurring (class/activity): 0=Sun .. 6=Sat, null for one-off goals
  day_of_week int check (day_of_week is null or (day_of_week between 0 and 6)),
  start_time text, -- HH:MM 24h
  end_time text,
  -- one-off goal deadline
  due_at timestamptz,
  remind_minutes int not null default 10,
  color text default '#8b5cf6',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_items_user_idx on public.schedule_items (user_id, active);
create index if not exists schedule_items_dow_idx on public.schedule_items (user_id, day_of_week);

alter table public.schedule_items enable row level security;

drop policy if exists "schedule_select_own" on public.schedule_items;
drop policy if exists "schedule_insert_own" on public.schedule_items;
drop policy if exists "schedule_update_own" on public.schedule_items;
drop policy if exists "schedule_delete_own" on public.schedule_items;

create policy "schedule_select_own" on public.schedule_items
  for select to authenticated using (auth.uid() = user_id);
create policy "schedule_insert_own" on public.schedule_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "schedule_update_own" on public.schedule_items
  for update to authenticated using (auth.uid() = user_id);
create policy "schedule_delete_own" on public.schedule_items
  for delete to authenticated using (auth.uid() = user_id);
