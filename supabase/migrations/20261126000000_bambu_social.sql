-- Aditiva. Aplicar solo después de prueba_aislamiento.py, por revisión de Claudio.
-- No altera tablas, políticas ni funciones existentes.
begin;

create function public.bambu_codigo_amigo()
returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;
revoke all on function public.bambu_codigo_amigo() from public, anon;
grant execute on function public.bambu_codigo_amigo() to authenticated, service_role;

create table public.bambu_perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apodo text not null check (length(btrim(apodo)) between 1 and 24),
  avatar integer not null default 0 check (avatar between 0 and 9),
  nivel integer not null default 0 check (nivel between 0 and 1000),
  racha integer not null default 0 check (racha between 0 and 100000),
  xp_semana integer not null default 0 check (xp_semana between 0 and 1000000),
  reps_semana integer not null default 0 check (reps_semana between 0 and 100000),
  records jsonb not null default '{}' check (jsonb_typeof(records) = 'object' and octet_length(records::text) <= 8192),
  -- Métricas de Perfil que ya muestran las pantallas de Ricardo. Nunca permisos.
  estadisticas jsonb not null default '{}' check (jsonb_typeof(estadisticas) = 'object' and octet_length(estadisticas::text) <= 4096),
  privado boolean not null default true,
  codigo_amigo text not null unique default public.bambu_codigo_amigo() check (codigo_amigo ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
  updated_at timestamptz not null default now()
);
create table public.bambu_amistades (
  de uuid not null references auth.users(id) on delete cascade,
  para uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada')),
  created_at timestamptz not null default now(),
  primary key (de, para),
  check (de <> para)
);
-- Una sola relación por pareja, aunque ambas cuentas pidan amistad a la vez.
create unique index bambu_amistades_pareja on public.bambu_amistades (least(de, para), greatest(de, para));
create index bambu_amistades_para on public.bambu_amistades (para, estado);
create table public.bambu_duelos (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references auth.users(id) on delete cascade,
  para uuid not null references auth.users(id) on delete cascade,
  ejercicio text not null check (ejercicio in ('Lagartijas', 'Sentadillas', 'Fondos', 'Dominadas', 'Burpees', 'Jumping jacks')),
  de_reps integer not null check (de_reps between 0 and 300),
  para_reps integer check (para_reps between 0 and 300),
  estado text not null default 'abierto' check (estado in ('abierto', 'listo')),
  creado timestamptz not null default now(),
  respondido timestamptz,
  check (de <> para),
  check ((estado = 'abierto' and para_reps is null and respondido is null) or
         (estado = 'listo' and para_reps is not null and respondido is not null))
);
create index bambu_duelos_de on public.bambu_duelos (de, creado desc);
create index bambu_duelos_para on public.bambu_duelos (para, creado desc);
create table public.bambu_pases (
  llave text primary key check (llave ~ '^[A-Za-z0-9_-]{16,40}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  hasta timestamptz not null check (isfinite(hasta))
);
create index bambu_pases_user on public.bambu_pases (user_id);
create table public.bambu_widget (
  llave text primary key check (llave ~ '^[A-Za-z0-9_-]{16,40}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  estado jsonb not null check (jsonb_typeof(estado) = 'object' and octet_length(estado::text) <= 4096)
);
create index bambu_widget_user on public.bambu_widget (user_id);

alter table public.bambu_perfiles enable row level security;
alter table public.bambu_perfiles force row level security;
alter table public.bambu_amistades enable row level security;
alter table public.bambu_amistades force row level security;
alter table public.bambu_duelos enable row level security;
alter table public.bambu_duelos force row level security;
alter table public.bambu_pases enable row level security;
alter table public.bambu_pases force row level security;
alter table public.bambu_widget enable row level security;
alter table public.bambu_widget force row level security;
revoke all on public.bambu_perfiles, public.bambu_amistades, public.bambu_duelos, public.bambu_pases, public.bambu_widget from public, anon, authenticated;
grant all on public.bambu_perfiles, public.bambu_amistades, public.bambu_duelos, public.bambu_pases, public.bambu_widget to service_role;

grant select, delete on public.bambu_perfiles to authenticated;
grant insert (user_id, apodo, avatar, nivel, racha, xp_semana, reps_semana, records, estadisticas, privado),
      update (user_id, apodo, avatar, nivel, racha, xp_semana, reps_semana, records, estadisticas, privado)
  on public.bambu_perfiles to authenticated;
grant select on public.bambu_amistades to authenticated;
grant select, delete on public.bambu_duelos to authenticated;
grant insert (de, para, ejercicio, de_reps) on public.bambu_duelos to authenticated;
grant select, insert, update, delete on public.bambu_pases, public.bambu_widget to authenticated;

create policy bambu_amistades_leer on public.bambu_amistades for select to authenticated
  using ((select auth.uid()) in (de, para));
create policy bambu_perfiles_leer on public.bambu_perfiles for select to authenticated
  using (user_id = (select auth.uid()) or exists (
    select 1 from public.bambu_amistades a where a.estado = 'aceptada' and
      ((a.de = (select auth.uid()) and a.para = user_id) or (a.para = (select auth.uid()) and a.de = user_id))
  ));
create policy bambu_perfiles_insertar on public.bambu_perfiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy bambu_perfiles_actualizar on public.bambu_perfiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy bambu_perfiles_borrar on public.bambu_perfiles for delete to authenticated
  using (user_id = (select auth.uid()));
create policy bambu_duelos_leer on public.bambu_duelos for select to authenticated
  using ((select auth.uid()) in (de, para));
create policy bambu_duelos_crear on public.bambu_duelos for insert to authenticated
  with check (de = (select auth.uid()) and estado = 'abierto' and para_reps is null and exists (
    select 1 from public.bambu_amistades a where a.estado = 'aceptada' and
      ((a.de = bambu_duelos.de and a.para = bambu_duelos.para) or (a.para = bambu_duelos.de and a.de = bambu_duelos.para))
  ));
create policy bambu_duelos_borrar on public.bambu_duelos for delete to authenticated
  using ((select auth.uid()) in (de, para));
create policy bambu_pases_propios on public.bambu_pases for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy bambu_widget_propio on public.bambu_widget for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.bambu_perfil_fecha()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.bambu_perfil_fecha() from public, anon, authenticated;
create trigger bambu_perfil_fecha before update on public.bambu_perfiles
  for each row execute function public.bambu_perfil_fecha();

-- Las RPC privilegiadas son una API deliberada y acotada: uid comprobado, search_path
-- vacío y EXECUTE revocado a PUBLIC y anon. No existe un listado de desconocidos.
create function public.bambu_buscar_por_codigo(p_codigo text)
returns table(apodo text, avatar integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if upper(btrim(p_codigo)) !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$' then return; end if;
  return query select p.apodo, p.avatar from public.bambu_perfiles p
    where p.codigo_amigo = upper(btrim(p_codigo)) and p.user_id <> auth.uid();
end;
$$;

-- Las solicitudes solo exponen identidad mínima. Los números se consultan después
-- de aceptar, mediante la política de bambu_perfiles.
create function public.bambu_directorio()
returns table(uid uuid, apodo text, avatar integer, nivel integer, privada boolean, siguiendo jsonb, actualizado timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  return query select p.user_id, p.apodo, p.avatar,
    case when a.estado = 'aceptada' then p.nivel else 0 end,
    true, -- Toda nueva amistad requiere aceptación, aunque el perfil antiguo diga pública.
    case when a.estado = 'aceptada' then jsonb_build_array(auth.uid()) else '[]'::jsonb end,
    case when a.estado = 'aceptada' then p.updated_at else null end
  from public.bambu_amistades a join public.bambu_perfiles p
    on p.user_id = case when a.de = auth.uid() then a.para else a.de end
  where auth.uid() in (a.de, a.para);
end;
$$;

create function public.bambu_pedir_amistad(p_para text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  select p.user_id into target from public.bambu_perfiles p where p.codigo_amigo = upper(btrim(p_para));
  -- La firma antigua recibe uid. Solo se permite si la relación ya existe.
  if target is null then
    select case when a.de = me then a.para else a.de end into target
      from public.bambu_amistades a where me in (a.de, a.para)
      and (case when a.de = me then a.para else a.de end)::text = p_para;
  end if;
  if target is null or target = me or not exists (select 1 from public.bambu_perfiles where user_id = me) then
    raise exception 'Revisa el código de tu amigo.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me, target)::text || greatest(me, target)::text, 0));
  -- Peticiones cruzadas equivalen a consentimiento de ambas cuentas.
  update public.bambu_amistades set estado = 'aceptada' where de = target and para = me and estado = 'pendiente';
  if exists (select 1 from public.bambu_amistades where (de = me and para = target) or (de = target and para = me)) then return; end if;
  if (select count(*) from public.bambu_amistades where de = me and estado = 'pendiente') >= 200 then
    raise exception 'Ya tienes muchas solicitudes pendientes.' using errcode = '42501';
  end if;
  insert into public.bambu_amistades (de, para) values (me, target);
end;
$$;

create function public.bambu_responder_amistad(p_de uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me, p_de)::text || greatest(me, p_de)::text, 0));
  if p_aceptar then
    update public.bambu_amistades set estado = 'aceptada' where de = p_de and para = me and estado = 'pendiente';
  else
    delete from public.bambu_amistades where de = p_de and para = me and estado = 'pendiente';
  end if;
  if not found then raise exception 'La solicitud ya no está pendiente.' using errcode = '42501'; end if;
end;
$$;

create function public.bambu_cancelar_amistad(p_de uuid, p_para uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if me <> p_de and me <> p_para then raise exception 'Esta solicitud no es tuya.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(p_de, p_para)::text || greatest(p_de, p_para)::text, 0));
  delete from public.bambu_amistades where (de = p_de and para = p_para) or (de = p_para and para = p_de);
end;
$$;

create function public.bambu_responder_duelo(p_id uuid, p_reps integer)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if p_reps is null or p_reps < 0 or p_reps > 300 then raise exception 'Escribe entre 0 y 300 repeticiones.' using errcode = '23514'; end if;
  -- UPDATE atómico: dos respuestas concurrentes no pueden ganar la misma fila.
  update public.bambu_duelos set para_reps = p_reps, estado = 'listo', respondido = now()
    where id = p_id and para = me and estado = 'abierto' and para_reps is null
      and creado >= now() - interval '48 hours';
  if not found then raise exception 'El duelo ya no está disponible para responder.' using errcode = '42501'; end if;
end;
$$;

revoke all on function public.bambu_buscar_por_codigo(text), public.bambu_directorio(),
  public.bambu_pedir_amistad(text), public.bambu_responder_amistad(uuid, boolean),
  public.bambu_cancelar_amistad(uuid, uuid), public.bambu_responder_duelo(uuid, integer) from public, anon;
grant execute on function public.bambu_buscar_por_codigo(text), public.bambu_directorio(),
  public.bambu_pedir_amistad(text), public.bambu_responder_amistad(uuid, boolean),
  public.bambu_cancelar_amistad(uuid, uuid), public.bambu_responder_duelo(uuid, integer) to authenticated;

commit;
