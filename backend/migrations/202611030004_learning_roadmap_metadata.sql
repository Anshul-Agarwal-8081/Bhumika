-- Store the difficulty, estimated duration, and discovered resource snapshot with each roadmap.
-- This is additive and leaves existing roadmap rows unchanged.
alter table public.learning_roadmaps
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Preserve the resources older roadmaps referenced by looking up the owner's latest
-- saved search for that topic. New roadmaps store an exact snapshot in this column.
update public.learning_roadmaps as roadmap
set metadata = jsonb_build_object(
  'difficulty', coalesce(roadmap.topics->0->>'difficulty', 'Beginner'),
  'estimatedTotalDuration', '',
  'resources', coalesce((
    select searches.results
    from public.learning_searches as searches
    where searches.user_id = roadmap.user_id
      and searches.query = roadmap.query
    order by searches.created_at desc
    limit 1
  ), '[]'::jsonb)
)
where roadmap.metadata = '{}'::jsonb;
