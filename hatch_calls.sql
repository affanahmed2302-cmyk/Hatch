create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  room_id text not null,
  call_type text not null default 'video' check (call_type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','rejected','ended','missed')),
  created_at timestamptz default now()
);
alter table public.calls enable row level security;
drop policy if exists "calls_all" on public.calls;
create policy "calls_all" on public.calls for all to authenticated using (true) with check (true);
notify pgrst, 'reload schema';
