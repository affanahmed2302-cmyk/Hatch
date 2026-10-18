-- Optional career fields for leaderboard ranking
-- Run in Supabase SQL Editor once

alter table public.profiles add column if not exists github_url text;
alter table public.profiles add column if not exists github_handle text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists leetcode_url text;
alter table public.profiles add column if not exists leetcode_handle text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists rep_score int default 0;

comment on column public.profiles.phone is 'Optional; used in ranking; not shown on public feed';
