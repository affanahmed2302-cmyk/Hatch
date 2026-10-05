-- Hatch: avatars storage + free_now (unique live queries)
-- Paste in Supabase → SQL Editor → Run
-- Safe to re-run (drops policies by name first)

-- ========== 1) AVATARS BUCKET ==========
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_auth_insert" on storage.objects;
drop policy if exists "avatars_auth_update" on storage.objects;
drop policy if exists "avatars_auth_delete" on storage.objects;

create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "avatars_auth_update"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars');

create policy "avatars_auth_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars');

-- ========== 2) FREE NOW (live place + unique query/note) ==========
create table if not exists public.free_now (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place text not null,
  note text,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- add note column if table already existed without it
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'free_now' and column_name = 'note'
  ) then
    alter table public.free_now add column note text;
  end if;
end $$;

create index if not exists free_now_expires_idx on public.free_now (expires_at desc);
create index if not exists free_now_user_idx on public.free_now (user_id);

alter table public.free_now enable row level security;

drop policy if exists "free_now_select" on public.free_now;
drop policy if exists "free_now_insert" on public.free_now;
drop policy if exists "free_now_delete" on public.free_now;

create policy "free_now_select"
on public.free_now for select
to authenticated
using (true);

create policy "free_now_insert"
on public.free_now for insert
to authenticated
with check (auth.uid() = user_id);

create policy "free_now_delete"
on public.free_now for delete
to authenticated
using (auth.uid() = user_id);
