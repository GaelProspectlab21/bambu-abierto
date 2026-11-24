-- Bambú: caja negra de la sesión. Guarda QUÉ le pasó a la sesión en cada teléfono
-- (arranque, renovación del token, cierre) para diagnosticar por qué el iPhone pedía
-- contraseña. Sin tokens ni contraseñas: solo eventos y códigos de error.

create table if not exists public.bambu_auth_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  ua text,
  received_at timestamptz not null default now(),
  constraint bambu_auth_events_event check (char_length(event) <= 40),
  constraint bambu_auth_events_detail check (pg_column_size(detail) <= 2048)
);
create index if not exists bambu_auth_events_user_at on public.bambu_auth_events (user_id, at desc);

alter table public.bambu_auth_events enable row level security;
alter table public.bambu_auth_events force row level security;
revoke all on table public.bambu_auth_events from anon, authenticated;

create or replace function public.bambu_auth_log(p_events jsonb, p_ua text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  total integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 100 then
    raise exception 'Invalid auth log' using errcode = '22023';
  end if;
  insert into public.bambu_auth_events (user_id, at, event, detail, ua)
  select current_user_id, to_timestamp((item ->> 'at')::numeric / 1000), left(item ->> 'event', 40),
         coalesce(item -> 'detail', '{}'::jsonb), left(p_ua, 300)
  from jsonb_array_elements(p_events) item
  where jsonb_typeof(item -> 'at') = 'number' and jsonb_typeof(item -> 'event') = 'string'
    and (item -> 'detail' is null or jsonb_typeof(item -> 'detail') = 'object');
  get diagnostics total = row_count;
  -- Solo se necesitan los últimos 60 días.
  delete from public.bambu_auth_events where user_id = current_user_id and at < now() - interval '60 days';
  return total;
end;
$$;

revoke all on function public.bambu_auth_log(jsonb, text) from public, anon, authenticated;
grant execute on function public.bambu_auth_log(jsonb, text) to authenticated;
