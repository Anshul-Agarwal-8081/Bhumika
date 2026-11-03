-- Additive integrity and authorization fixes for the initial backend schema.
-- This migration does not delete or rewrite application data.

do $$
begin
  if exists (
    select 1
    from public.resume_versions rv
    join public.resumes r on r.id = rv.resume_id
    where rv.user_id <> r.user_id
  ) then
    raise exception 'Cannot add resume ownership constraint: existing resume_versions rows have a different owner than their resume.';
  end if;

  if exists (
    select 1
    from public.interview_reports ir
    join public.interview_sessions s on s.id = ir.session_id
    where ir.user_id <> s.user_id
  ) then
    raise exception 'Cannot add interview ownership constraint: existing interview_reports rows have a different owner than their session.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'resumes_id_user_id_unique'
      and conrelid = 'public.resumes'::regclass
  ) then
    alter table public.resumes
      add constraint resumes_id_user_id_unique unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'interview_sessions_id_user_id_unique'
      and conrelid = 'public.interview_sessions'::regclass
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_id_user_id_unique unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'resume_versions_owner_fk'
      and conrelid = 'public.resume_versions'::regclass
  ) then
    alter table public.resume_versions
      add constraint resume_versions_owner_fk
      foreign key (resume_id, user_id)
      references public.resumes (id, user_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'interview_reports_owner_fk'
      and conrelid = 'public.interview_reports'::regclass
  ) then
    alter table public.interview_reports
      add constraint interview_reports_owner_fk
      foreign key (session_id, user_id)
      references public.interview_sessions (id, user_id)
      on delete cascade;
  end if;
end;
$$;

create index if not exists bhumika_opportunities_cache_expires_at_idx
  on public.opportunities_cache (expires_at);
create index if not exists bhumika_learning_roadmaps_user_updated_idx
  on public.learning_roadmaps (user_id, updated_at desc);
create index if not exists bhumika_saved_resources_user_created_idx
  on public.saved_resources (user_id, created_at desc);
create index if not exists bhumika_resumes_user_updated_idx
  on public.resumes (user_id, updated_at desc);
create index if not exists bhumika_resume_versions_user_created_idx
  on public.resume_versions (user_id, created_at desc);
create index if not exists bhumika_interview_reports_user_created_idx
  on public.interview_reports (user_id, created_at desc);

create or replace function public.bhumika_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'user_preferences',
    'learning_roadmaps',
    'saved_opportunities',
    'resumes',
    'user_skills',
    'interview_sessions',
    'arena_progress',
    'career_roles'
  ] loop
    execute format('drop trigger if exists bhumika_set_updated_at on public.%I', target_table);
    execute format(
      'create trigger bhumika_set_updated_at before update on public.%I for each row execute function public.bhumika_set_updated_at()',
      target_table
    );
  end loop;
end;
$$;

-- Progress, achievement, activity, and evaluation writes must go through trusted backend logic.
drop policy if exists "arena_progress_owner_access" on public.arena_progress;
create policy "arena_progress_owner_read" on public.arena_progress
  for select using (auth.uid() = user_id);

drop policy if exists "user_achievements_owner_access" on public.user_achievements;
create policy "user_achievements_owner_read" on public.user_achievements
  for select using (auth.uid() = user_id);

drop policy if exists "user_activity_owner_access" on public.user_activity;
create policy "user_activity_owner_read" on public.user_activity
  for select using (auth.uid() = user_id);

drop policy if exists "interview_reports_owner_access" on public.interview_reports;
create policy "interview_reports_owner_read" on public.interview_reports
  for select using (auth.uid() = user_id);
