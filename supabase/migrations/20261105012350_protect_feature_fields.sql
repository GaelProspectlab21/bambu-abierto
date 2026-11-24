-- Reject old clients before they can erase reading drafts and task metadata.
create or replace function public.save_my_bambu_data(p_payload jsonb, p_expected_revision integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision integer;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_payload ->> 'schemaRevision' is distinct from '2'
    or not (p_payload ? 'activeReading')
    or jsonb_typeof(p_payload -> 'activeReading') not in ('object', 'null')
    or jsonb_typeof(p_payload -> 'tasks') is distinct from 'array' then
    raise exception 'BAMBU_UPDATE_REQUIRED' using errcode = '22023';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid expected revision' using errcode = '22023';
  end if;

  if p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or not (p_payload ?& array['version', 'profile', 'habits', 'reading', 'training', 'focus', 'activeFocus'])
    or jsonb_typeof(p_payload -> 'version') <> 'number'
    or p_payload ->> 'version' <> '2'
    or jsonb_typeof(p_payload -> 'profile') <> 'object'
    or jsonb_typeof(p_payload -> 'habits') <> 'object'
    or jsonb_typeof(p_payload -> 'reading') <> 'array'
    or jsonb_typeof(p_payload -> 'training') <> 'array'
    or jsonb_typeof(p_payload -> 'focus') <> 'array'
    or jsonb_typeof(p_payload -> 'activeFocus') not in ('object', 'null')
    or pg_column_size(p_payload) > 1048576 then
    raise exception 'Invalid Bambú snapshot' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.bambu_user_data (user_id, revision, payload)
    values (current_user_id, 1, p_payload)
    on conflict (user_id) do nothing
    returning revision into next_revision;
  else
    update public.bambu_user_data
    set payload = p_payload,
        revision = revision + 1,
        updated_at = now()
    where user_id = current_user_id
      and revision = p_expected_revision
    returning revision into next_revision;
  end if;

  if next_revision is null then
    raise exception 'BAMBU_REVISION_CONFLICT' using errcode = '40001';
  end if;

  return next_revision;
end;
$$;

comment on function public.save_my_bambu_data(jsonb, integer) is
  'Authenticated owner-only snapshot write. SECURITY DEFINER is constrained by auth.uid(), a fixed empty search_path, explicit payload validation, CAS revision and authenticated-only EXECUTE.';

revoke all on function public.save_my_bambu_data(jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_my_bambu_data(jsonb, integer) to authenticated;
