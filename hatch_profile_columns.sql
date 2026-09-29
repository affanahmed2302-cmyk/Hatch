-- Fix missing profile columns (paste in Supabase SQL Editor then Run)
alter table public.profiles add column if not exists career_goal text;
alter table public.profiles add column if not exists intent text;
alter table public.profiles add column if not exists availability text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists github_handle text;
alter table public.profiles add column if not exists leetcode_handle text;
alter table public.profiles add column if not exists tech_stack text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists year int;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] default '{}';
alter table public.profiles add column if not exists rep_score int default 0;
alter table public.profiles add column if not exists terms_accepted boolean default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
notify pgrst, 'reload schema';
