-- Enforce one saved copy of each URL per user without changing saved data.
do $$
begin
  if exists (
    select 1 from public.saved_resources
    where resource->>'url' is not null
    group by user_id, resource->>'url'
    having count(*) > 1
  ) then
    raise exception 'Duplicate saved resource URLs exist. Remove duplicates per user before applying this migration.';
  end if;
end;
$$;

create unique index if not exists bhumika_saved_resources_user_url_unique
  on public.saved_resources (user_id, (resource->>'url'))
  where resource->>'url' is not null;
