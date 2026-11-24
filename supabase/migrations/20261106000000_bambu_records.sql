-- Bambú v3: un registro por fila en vez de un solo JSON por usuario.
--
-- Por qué: el JSON único tenía tope de 1 MB y se reescribía completo en cada toque.
-- Con entrenamiento diario (series, check-ins) ese tope llega en meses y cada guardado
-- mandaba cientos de KB. Aquí cada lectura, serie o tarea es su propia fila: se sube
-- solo lo que cambió, gana la edición más reciente por registro y no hay tope global.
--
-- Sincronización: el cliente empuja cambios con bambu_push (último en escribir gana por
-- client_updated_at) y jala con `seq > cursor`. `seq` se renueva en cada escritura, así
-- que un cursor alcanza para saber qué cambió desde la última vez.

create sequence if not exists public.bambu_records_seq;

create table if not exists public.bambu_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  client_updated_at bigint not null,
  seq bigint not null default nextval('public.bambu_records_seq'),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, collection, id),
  constraint bambu_records_collection check (collection in (
    'reading', 'focus', 'task', 'bible', 'work', 'set', 'activity',
    'checkin', 'body', 'exercise', 'habit', 'meta')),
  constraint bambu_records_id check (char_length(id) between 1 and 160),
  constraint bambu_records_payload check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 65536),
  constraint bambu_records_clock check (client_updated_at >= 0)
);

create index if not exists bambu_records_user_seq on public.bambu_records (user_id, seq);

alter table public.bambu_records enable row level security;
alter table public.bambu_records force row level security;

revoke all on table public.bambu_records from anon, authenticated;
grant select on table public.bambu_records to authenticated;

drop policy if exists bambu_records_select_own on public.bambu_records;
create policy bambu_records_select_own
  on public.bambu_records for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Cada escritura recibe un seq nuevo: el cursor del cliente la verá en el siguiente pull.
create or replace function public.bambu_records_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.seq := nextval('public.bambu_records_seq');
  new.server_updated_at := now();
  return new;
end;
$$;

drop trigger if exists bambu_records_touch on public.bambu_records;
create trigger bambu_records_touch
  before insert or update on public.bambu_records
  for each row execute function public.bambu_records_touch();

create or replace function public.bambu_push(p_records jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  latest bigint;
  future_limit bigint := (extract(epoch from now()) * 1000)::bigint + 86400000;
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

  insert into public.bambu_records as r (user_id, collection, id, payload, deleted, client_updated_at)
  select current_user_id, item ->> 'collection', item ->> 'id', item -> 'payload',
         coalesce((item ->> 'deleted')::boolean, false), (item ->> 'clientUpdatedAt')::bigint
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
  'Owner-only batch upsert. SECURITY DEFINER pinned to auth.uid(), empty search_path, shape and size checks, last-writer-wins by client_updated_at.';

revoke all on function public.bambu_push(jsonb) from public, anon, authenticated;
grant execute on function public.bambu_push(jsonb) to authenticated;

-- El JSON único queda como respaldo de solo lectura: cualquier pestaña vieja que intente
-- escribir ahí recibe "hay versión nueva" y no puede pisar nada.
create or replace function public.save_my_bambu_data(p_payload jsonb, p_expected_revision integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'BAMBU_UPDATE_REQUIRED' using errcode = '22023';
end;
$$;

revoke all on function public.save_my_bambu_data(jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_my_bambu_data(jsonb, integer) to authenticated;
