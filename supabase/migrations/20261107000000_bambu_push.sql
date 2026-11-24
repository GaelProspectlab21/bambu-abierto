-- Bambú: recordatorios con notificación push.
--
-- Cómo funciona: cada teléfono que activa avisos deja aquí su "buzón" (la suscripción push
-- que entrega el navegador). Cada 5 minutos pg_cron llama a la función bambu-remind, que
-- revisa los horarios de cada usuario, ve si ya hizo lo que toca y manda el push.
-- bambu_push_log evita mandar el mismo aviso dos veces: se apunta ANTES de enviar.

create table if not exists public.bambu_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  failures integer not null default 0,
  constraint bambu_push_subs_endpoint check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  constraint bambu_push_subs_keys check (char_length(p256dh) between 40 and 200 and char_length(auth) between 10 and 100),
  constraint bambu_push_subs_tz check (char_length(tz) between 1 and 60)
);
create index if not exists bambu_push_subs_user on public.bambu_push_subs (user_id);

create table if not exists public.bambu_push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Nadie desde el navegador lee ni escribe estas tablas directo: solo las RPC de abajo
-- y la función del servidor (service_role).
alter table public.bambu_push_subs enable row level security;
alter table public.bambu_push_subs force row level security;
alter table public.bambu_push_log enable row level security;
alter table public.bambu_push_log force row level security;
revoke all on table public.bambu_push_subs from anon, authenticated;
revoke all on table public.bambu_push_log from anon, authenticated;

create or replace function public.bambu_push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_tz text)
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
  insert into public.bambu_push_subs (endpoint, user_id, p256dh, auth, tz)
  values (p_endpoint, current_user_id, p_p256dh, p_auth, coalesce(nullif(p_tz, ''), 'America/Mexico_City'))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz, failures = 0;
  -- Tope sano: 10 teléfonos o navegadores por cuenta; se van los más viejos.
  delete from public.bambu_push_subs
  where user_id = current_user_id and endpoint in (
    select endpoint from public.bambu_push_subs where user_id = current_user_id order by created_at desc offset 10);
  select count(*) into total from public.bambu_push_subs where user_id = current_user_id;
  return total;
end;
$$;

create or replace function public.bambu_push_unsubscribe(p_endpoint text)
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
  delete from public.bambu_push_subs where endpoint = p_endpoint and user_id = current_user_id;
  select count(*) into total from public.bambu_push_subs where user_id = current_user_id;
  return total;
end;
$$;

revoke all on function public.bambu_push_subscribe(text, text, text, text) from public, anon, authenticated;
revoke all on function public.bambu_push_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.bambu_push_subscribe(text, text, text, text) to authenticated;
grant execute on function public.bambu_push_unsubscribe(text) to authenticated;

-- El reloj: cada 5 minutos. El secreto que firma la llamada vive en Vault, no en el texto del job.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('bambu-remind') where exists (select 1 from cron.job where jobname = 'bambu-remind');
select cron.schedule('bambu-remind', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/bambu-remind',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bambu-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'bambu_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000)
$job$);

-- Limpieza: la bitácora solo necesita los últimos 60 días.
select cron.unschedule('bambu-push-log-trim') where exists (select 1 from cron.job where jobname = 'bambu-push-log-trim');
select cron.schedule('bambu-push-log-trim', '17 4 * * *', $job$
  delete from public.bambu_push_log where sent_at < now() - interval '60 days'
$job$);
