create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  category text default 'other',
  organization text,
  year_label text,
  link_url text,
  is_public boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists achievements_user_idx on public.achievements(user_id, sort_order);
alter table public.achievements enable row level security;
drop policy if exists ach_select on public.achievements;
drop policy if exists ach_insert on public.achievements;
drop policy if exists ach_update on public.achievements;
drop policy if exists ach_delete on public.achievements;
create policy ach_select on public.achievements for select to authenticated using (is_public = true or auth.uid() = user_id);
create policy ach_insert on public.achievements for insert to authenticated with check (auth.uid() = user_id);
create policy ach_update on public.achievements for update to authenticated using (auth.uid() = user_id);
create policy ach_delete on public.achievements for delete to authenticated using (auth.uid() = user_id);
notify pgrst, 'reload schema';
