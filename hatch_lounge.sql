-- Campus Lounge (Discord-style global channels for all BMS students)
create table if not exists public.lounge_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'general',
  content text not null,
  created_at timestamptz default now()
);

create index if not exists lounge_messages_channel_created_idx
  on public.lounge_messages(channel, created_at desc);

create index if not exists lounge_messages_sender_idx
  on public.lounge_messages(sender_id);

alter table public.lounge_messages enable row level security;

drop policy if exists "lounge_select" on public.lounge_messages;
create policy "lounge_select" on public.lounge_messages
  for select to authenticated using (true);

drop policy if exists "lounge_insert" on public.lounge_messages;
create policy "lounge_insert" on public.lounge_messages
  for insert to authenticated with check (auth.uid() = sender_id);

drop policy if exists "lounge_delete_own" on public.lounge_messages;
create policy "lounge_delete_own" on public.lounge_messages
  for delete to authenticated using (auth.uid() = sender_id);

-- Enable realtime for lounge
do $$ begin
  alter publication supabase_realtime add table public.lounge_messages;
exception when others then null; end $$;
