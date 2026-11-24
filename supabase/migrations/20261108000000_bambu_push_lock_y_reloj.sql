-- Bambú: dos arreglos de la auditoría de Codex (8-nov-2026) en las dos puertas de escritura.
--
-- 1) Candado por dueño. El seq se asigna al escribir la fila, no al confirmar. Si dos escrituras
--    del mismo usuario se cruzaban (teléfono + etiqueta NFC), la de seq menor podía confirmarse
--    DESPUÉS de que otro teléfono ya bajó la de seq mayor, y el cursor se la saltaba para siempre.
--    pg_advisory_xact_lock hace que la segunda espere a que la primera confirme: así, para un
--    mismo dueño, el orden de seq es el orden de confirmación. Se suelta solo al terminar.
--
-- 2) Reloj adelantado. Se aceptaban horas hasta un día en el futuro y la fila "del futuro" le
--    ganaba a cualquier cambio posterior de un teléfono con hora correcta. Ahora la hora guardada
--    nunca pasa de la hora del servidor + 1 minuto. El límite de un día se queda solo como
--    filtro de basura (rechaza el lote), igual que antes.

create or replace function public.bambu_push(p_records jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  latest bigint;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  future_limit bigint := now_ms + 86400000;
  clock_cap bigint := now_ms + 60000;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) = 0 or jsonb_array_length(p_records) > 500 then
    raise exception 'Invalid Bambu batch' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_records) item
    where jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item -> 'collection') <> 'string'
      or jsonb_typeof(item -> 'id') <> 'string'
      or jsonb_typeof(item -> 'clientUpdatedAt') <> 'number'
      or (item -> 'payload') is null or jsonb_typeof(item -> 'payload') <> 'object'
      or (item ->> 'clientUpdatedAt')::numeric > future_limit
  ) then
    raise exception 'Invalid Bambu record' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bambu_records:' || current_user_id::text, 0));

  insert into public.bambu_records as r (user_id, collection, id, payload, deleted, client_updated_at)
  select current_user_id, item ->> 'collection', item ->> 'id', item -> 'payload',
         coalesce((item ->> 'deleted')::boolean, false), least((item ->> 'clientUpdatedAt')::bigint, clock_cap)
  from jsonb_array_elements(p_records) item
  on conflict (user_id, collection, id) do update
    set payload = excluded.payload,
        deleted = excluded.deleted,
        client_updated_at = excluded.client_updated_at
    where r.client_updated_at <= excluded.client_updated_at;

  select coalesce(max(seq), 0) into latest from public.bambu_records where user_id = current_user_id;
  return latest;
end;
$$;

comment on function public.bambu_push(jsonb) is
  'Owner-only batch upsert. SECURITY DEFINER pinned to auth.uid(), empty search_path, shape and size checks, per-owner advisory lock so seq order = commit order, client clock capped at server now + 60 s, last-writer-wins by client_updated_at.';

revoke all on function public.bambu_push(jsonb) from public, anon, authenticated;
grant execute on function public.bambu_push(jsonb) to authenticated;

create or replace function public.bambu_push_for(p_user_id uuid, p_records jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest bigint;
  clock_cap bigint := (extract(epoch from now()) * 1000)::bigint + 60000;
begin
  if p_user_id is null or p_records is null or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) = 0 or jsonb_array_length(p_records) > 50 then
    raise exception 'Invalid Bambu batch' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bambu_records:' || p_user_id::text, 0));

  insert into public.bambu_records as r (user_id, collection, id, payload, deleted, client_updated_at)
  select p_user_id, item ->> 'collection', item ->> 'id', item -> 'payload',
         coalesce((item ->> 'deleted')::boolean, false), least((item ->> 'clientUpdatedAt')::bigint, clock_cap)
  from jsonb_array_elements(p_records) item
  where jsonb_typeof(item -> 'payload') = 'object'
  on conflict (user_id, collection, id) do update
    set payload = excluded.payload, deleted = excluded.deleted, client_updated_at = excluded.client_updated_at
    where r.client_updated_at <= excluded.client_updated_at;
  select coalesce(max(seq), 0) into latest from public.bambu_records where user_id = p_user_id;
  return latest;
end;
$$;
revoke all on function public.bambu_push_for(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.bambu_push_for(uuid, jsonb) to service_role;
