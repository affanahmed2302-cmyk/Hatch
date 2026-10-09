-- Ensure app_settings supports feature kill-switches
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
drop policy if exists "app_settings_select" on public.app_settings;
drop policy if exists "app_settings_all" on public.app_settings;
create policy "app_settings_select" on public.app_settings for select to authenticated using (true);
create policy "app_settings_all" on public.app_settings for all to authenticated using (true) with check (true);

-- Reports table (if missing)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reported_id uuid references auth.users(id) on delete set null,
  reason text,
  details text,
  status text default 'open',
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert" on public.reports;
drop policy if exists "reports_select" on public.reports;
create policy "reports_insert" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reports_select" on public.reports for select to authenticated using (true);

-- Force Sparks OFF until you turn it on again in Pilot (optional seed)
-- delete from app_settings where key in ('feature_sparks','dating_app_active');
-- insert into app_settings (key, value) values ('feature_sparks','false'), ('dating_app_active','false')
--   on conflict (key) do update set value = excluded.value;
