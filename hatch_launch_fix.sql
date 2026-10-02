-- One-shot launch fix: storage, push, profile mode, realtime-ish
-- Paste in Supabase SQL Editor → Run

alter table public.profiles add column if not exists profile_mode text default 'both';

create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
alter table public.push_subs enable row level security;
drop policy if exists "push all auth" on public.push_subs;
create policy "push all auth" on public.push_subs for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', true, 10485760)
on conflict (id) do update set public = true;

drop policy if exists "chat media read" on storage.objects;
create policy "chat media read" on storage.objects for select to public using (bucket_id = 'chat-media');
drop policy if exists "chat media upload" on storage.objects;
create policy "chat media upload" on storage.objects for insert to authenticated with check (bucket_id = 'chat-media');

-- Realtime: enable in Dashboard → Database → Replication if this fails
do $re$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.calls;
  exception when others then null;
  end;
end
$re$;
