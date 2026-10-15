-- Hard blocks + pinches (spam-safe)
-- Run once in Supabase SQL editor

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.pinches (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  check (from_id <> to_id)
);

create index if not exists pinches_from_created on public.pinches (from_id, created_at desc);
create index if not exists pinches_to_created on public.pinches (to_id, created_at desc);
create index if not exists blocks_blocker on public.user_blocks (blocker_id);
create index if not exists blocks_blocked on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
alter table public.pinches enable row level security;

drop policy if exists blocks_select on public.user_blocks;
create policy blocks_select on public.user_blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists blocks_insert on public.user_blocks;
create policy blocks_insert on public.user_blocks for insert to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists blocks_delete on public.user_blocks;
create policy blocks_delete on public.user_blocks for delete to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists pinches_select on public.pinches;
create policy pinches_select on public.pinches for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

drop policy if exists pinches_insert on public.pinches;
create policy pinches_insert on public.pinches for insert to authenticated
  with check (auth.uid() = from_id);
