-- Bambú: etiquetas NFC que funcionan sin sesión.
--
-- En iPhone una etiqueta solo abre Safari, nunca la app instalada, y Safari tiene su propia
-- sesión (en modo privado, ninguna). La etiqueta lleva una llave larga y aleatoria; la función
-- bambu-nfc la busca aquí, sabe de quién es y escribe la acción con bambu_push_for.
-- Una llave por cuenta. Si se pierde una etiqueta, se rota desde Ajustes y las viejas dejan de servir.

create table if not exists public.bambu_nfc_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  key text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  uses integer not null default 0,
  constraint bambu_nfc_keys_key check (char_length(key) between 32 and 64)
);
alter table public.bambu_nfc_keys enable row level security;
alter table public.bambu_nfc_keys force row level security;
revoke all on table public.bambu_nfc_keys from anon, authenticated;

-- La llave del dueño: la crea si no existe; con p_rotate = true la cambia.
create or replace function public.bambu_nfc_key(p_rotate boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  fresh text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  result text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  insert into public.bambu_nfc_keys (user_id, key) values (current_user_id, fresh)
  on conflict (user_id) do update
    set key = case when p_rotate then excluded.key else public.bambu_nfc_keys.key end,
        created_at = case when p_rotate then now() else public.bambu_nfc_keys.created_at end,
        uses = case when p_rotate then 0 else public.bambu_nfc_keys.uses end
  returning key into result;
  return result;
end;
$$;
revoke all on function public.bambu_nfc_key(boolean) from public, anon, authenticated;
grant execute on function public.bambu_nfc_key(boolean) to authenticated;

-- Igual que bambu_push (último en escribir gana), pero para un usuario dado. Solo el servidor.
create or replace function public.bambu_push_for(p_user_id uuid, p_records jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest bigint;
begin
  if p_user_id is null or p_records is null or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) = 0 or jsonb_array_length(p_records) > 50 then
    raise exception 'Invalid Bambu batch' using errcode = '22023';
  end if;
  insert into public.bambu_records as r (user_id, collection, id, payload, deleted, client_updated_at)
  select p_user_id, item ->> 'collection', item ->> 'id', item -> 'payload',
         coalesce((item ->> 'deleted')::boolean, false), (item ->> 'clientUpdatedAt')::bigint
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
