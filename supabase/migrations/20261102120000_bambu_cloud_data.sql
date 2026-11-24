create table public.bambu_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint bambu_user_data_payload_shape check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['version', 'profile', 'habits', 'reading', 'training', 'focus', 'activeFocus']
    and jsonb_typeof(payload -> 'version') = 'number'
    and payload ->> 'version' = '2'
    and jsonb_typeof(payload -> 'profile') = 'object'
    and jsonb_typeof(payload -> 'habits') = 'object'
    and jsonb_typeof(payload -> 'reading') = 'array'
    and jsonb_typeof(payload -> 'training') = 'array'
    and jsonb_typeof(payload -> 'focus') = 'array'
    and jsonb_typeof(payload -> 'activeFocus') in ('object', 'null')
    and pg_column_size(payload) <= 1048576
  )
);

alter table public.bambu_user_data enable row level security;
alter table public.bambu_user_data force row level security;

revoke all on table public.bambu_user_data from anon, authenticated;
grant select on table public.bambu_user_data to authenticated;

create policy bambu_user_data_select_own
  on public.bambu_user_data for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy bambu_user_data_insert_own
  on public.bambu_user_data for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy bambu_user_data_update_own
  on public.bambu_user_data for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy bambu_user_data_delete_own
  on public.bambu_user_data for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

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
