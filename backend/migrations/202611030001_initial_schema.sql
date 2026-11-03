-- Additive Supabase schema foundation; no existing tables are dropped.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', education text not null default '', target_role text not null default '',
  skills text[] not null default '{}', public_arena_profile boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '')) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.create_profile_for_auth_user();

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, preferences jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.learning_searches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check(char_length(query) between 1 and 300), results jsonb not null default '[]', created_at timestamptz not null default now()
);
create index if not exists learning_searches_user_created_idx on public.learning_searches(user_id, created_at desc);
create table if not exists public.learning_roadmaps (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, query text not null, topics jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  resource jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.opportunities_cache (
  provider text not null, external_id text not null, payload jsonb not null, expires_at timestamptz not null,
  primary key(provider, external_id)
);
create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, external_id text not null, payload jsonb not null,
  status text not null default 'Interested' check(status in ('Interested','Applied','Interviewing','Rejected','Offered')),
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, provider, external_id)
);
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, content jsonb not null default '{}', template text not null default 'classic',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(), resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, version integer not null, content jsonb not null,
  created_at timestamptz not null default now(), unique(resume_id, version)
);
create table if not exists public.career_roles (
  id text primary key, title text not null, source text not null, source_id text, description text not null default '', data jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.role_skills (
  role_id text not null references public.career_roles(id) on delete cascade, skill_id text not null, skill_name text not null,
  importance text not null default 'essential', primary key(role_id, skill_id)
);
create table if not exists public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade, skill_id text not null, self_assessed_level text,
  evidence jsonb not null default '[]', updated_at timestamptz not null default now(), primary key(user_id, skill_id)
);
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null, status text not null default 'created' check(status in ('created','active','completed','incomplete','failed')),
  started_at timestamptz, ended_at timestamptz, duration_seconds integer check(duration_seconds is null or duration_seconds >= 0),
  transcript jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists interview_sessions_user_created_idx on public.interview_sessions(user_id, created_at desc);
create table if not exists public.interview_reports (
  id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, report jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.arena_progress (
  user_id uuid primary key references auth.users(id) on delete cascade, xp integer not null default 0 check(xp >= 0),
  streak integer not null default 0 check(streak >= 0), stats jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.achievements (
  id text primary key, title text not null, description text not null, criteria jsonb not null default '{}'
);
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade, achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(), primary key(user_id, achievement_id)
);
create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null, reference_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists user_activity_user_created_idx on public.user_activity(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.learning_searches enable row level security;
alter table public.learning_roadmaps enable row level security;
alter table public.saved_resources enable row level security;
alter table public.opportunities_cache enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.career_roles enable row level security;
alter table public.role_skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_reports enable row level security;
alter table public.arena_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_activity enable row level security;

create policy "profile_owner_access" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "preferences_owner_access" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_search_owner_access" on public.learning_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmap_owner_access" on public.learning_roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_resources_owner_access" on public.saved_resources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_opportunities_owner_access" on public.saved_opportunities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes_owner_access" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resume_versions_owner_access" on public.resume_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_skills_owner_access" on public.user_skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interview_sessions_owner_access" on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interview_reports_owner_access" on public.interview_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "arena_progress_owner_access" on public.arena_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_achievements_owner_access" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_activity_owner_access" on public.user_activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "career_roles_read" on public.career_roles for select using (true);
create policy "role_skills_read" on public.role_skills for select using (true);
create policy "achievements_read" on public.achievements for select using (true);
-- opportunities_cache is server-managed and intentionally has no client policies.
