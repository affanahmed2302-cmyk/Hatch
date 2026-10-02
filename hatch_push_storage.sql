-- Push subscriptions + chat-media storage (phone-safe, no $$)

create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
create index if not exists idx_push_user on public.push_subs (user_id);
alter table public.push_subs enable row level security;
drop policy if exists "push read own" on public.push_subs;
create policy "push read own" on public.push_subs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "push insert own" on public.push_subs;
create policy "push insert own" on public.push_subs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "push delete own" on public.push_subs;
create policy "push delete own" on public.push_subs for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "push all auth" on public.push_subs;
create policy "push all auth" on public.push_subs for all to authenticated using (true) with check (true);

-- Storage bucket for voice notes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  10485760,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "chat media read" on storage.objects;
create policy "chat media read" on storage.objects for select to public using (bucket_id = 'chat-media');

drop policy if exists "chat media upload" on storage.objects;
create policy "chat media upload" on storage.objects for insert to authenticated with check (bucket_id = 'chat-media');

drop policy if exists "chat media update own" on storage.objects;
create policy "chat media update own" on storage.objects for update to authenticated using (bucket_id = 'chat-media');

drop policy if exists "chat media delete own" on storage.objects;
create policy "chat media delete own" on storage.objects for delete to authenticated using (bucket_id = 'chat-media');
