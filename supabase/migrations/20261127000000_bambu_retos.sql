-- Aditiva (v11, 27-nov). Retos de grupo de Ricardo (antes duelos de 1 contra 1) y caja de fallos.
-- No altera ni borra bambu_duelos: queda de solo lectura para la versión vieja del teléfono.
begin;

create table public.bambu_retos (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references auth.users(id) on delete cascade,
  participantes uuid[] not null check (cardinality(participantes) between 2 and 10),
  tipo text not null check (tipo in ('reps', 'aguante', 'cindy')),
  ejercicio text not null check (length(ejercicio) between 1 and 40),
  marcas jsonb not null default '{}' check (jsonb_typeof(marcas) = 'object' and octet_length(marcas::text) <= 2048),
  creado timestamptz not null default now(),
  movido timestamptz not null default now(),
  check (de = any(participantes))
);
create index bambu_retos_participantes on public.bambu_retos using gin (participantes);

create table public.bambu_fallos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  donde text not null check (length(donde) <= 40),
  error text not null check (length(error) <= 400),
  pila text not null default '' check (length(pila) <= 800),
  version text not null default '' check (length(version) <= 60),
  navegador text not null default '' check (length(navegador) <= 200),
  creado timestamptz not null default now()
);
create index bambu_fallos_user on public.bambu_fallos (user_id, creado desc);

alter table public.bambu_retos enable row level security;
alter table public.bambu_retos force row level security;
alter table public.bambu_fallos enable row level security;
alter table public.bambu_fallos force row level security;
revoke all on public.bambu_retos, public.bambu_fallos from public, anon, authenticated;
grant all on public.bambu_retos, public.bambu_fallos to service_role;
-- Leer y borrar directo; crear, marcar y salir solo por RPC (validan amistad, ejercicio y topes).
grant select, delete on public.bambu_retos to authenticated;
grant insert (user_id, donde, error, pila, version, navegador), delete on public.bambu_fallos to authenticated;

create policy bambu_retos_leer on public.bambu_retos for select to authenticated
  using ((select auth.uid()) = any(participantes));
create policy bambu_retos_borrar on public.bambu_retos for delete to authenticated
  using (de = (select auth.uid()));
create policy bambu_fallos_crear on public.bambu_fallos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy bambu_fallos_borrar on public.bambu_fallos for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tope de 30 fallos por hora por cuenta: un bucle de errores no llena la base.
create function public.bambu_fallos_tope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.bambu_fallos f where f.user_id = new.user_id and f.creado > now() - interval '1 hour') >= 30 then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function public.bambu_fallos_tope() from public, anon, authenticated;
create trigger bambu_fallos_tope before insert on public.bambu_fallos
  for each row execute function public.bambu_fallos_tope();

create function public.bambu_reto_valido(p_tipo text, p_ejercicio text, p_marca integer)
returns boolean language sql immutable set search_path = '' as $$
  select case p_tipo
    when 'reps' then p_ejercicio in ('Lagartijas', 'Sentadillas', 'Fondos', 'Dominadas', 'Burpees', 'Jumping jacks', 'Lagartijas diamante', 'Pike push ups', 'Chin ups', 'Dominadas australianas') and p_marca between 0 and 300
    when 'aguante' then p_ejercicio in ('Plancha', 'Plancha con brazos estirados', 'Plancha lateral', 'Wall sit', 'Colgarse de la barra', 'Hollow hold', 'L sit') and p_marca between 0 and 600
    when 'cindy' then p_ejercicio = 'Cindy' and p_marca between 0 and 2000
    else false end;
$$;
revoke all on function public.bambu_reto_valido(text, text, integer) from public, anon;
grant execute on function public.bambu_reto_valido(text, text, integer) to authenticated, service_role;

create function public.bambu_crear_reto(p_rivales uuid[], p_tipo text, p_ejercicio text, p_marca integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  todos uuid[];
  nuevo uuid;
begin
  if yo is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if not public.bambu_reto_valido(p_tipo, p_ejercicio, p_marca) then raise exception 'Reto no válido.' using errcode = '23514'; end if;
  select array_agg(distinct r) into todos from unnest(coalesce(p_rivales, '{}')) r where r <> yo;
  if todos is null or cardinality(todos) < 1 or cardinality(todos) > 9 then raise exception 'Elige de 1 a 9 amigos.' using errcode = '23514'; end if;
  if exists (
    select 1 from unnest(todos) r where not exists (
      select 1 from public.bambu_amistades a where a.estado = 'aceptada' and
        ((a.de = yo and a.para = r) or (a.para = yo and a.de = r)))
  ) then raise exception 'Solo puedes retar a tus amigos.' using errcode = '42501'; end if;
  insert into public.bambu_retos (de, participantes, tipo, ejercicio, marcas)
    values (yo, array_prepend(yo, todos), p_tipo, p_ejercicio, jsonb_build_object(yo::text, p_marca))
    returning id into nuevo;
  return nuevo;
end;
$$;

-- Cada quien pone su marca UNA vez: no se puede repetir hasta ganar.
create function public.bambu_marcar_reto(p_id uuid, p_marca integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  r public.bambu_retos;
begin
  if yo is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  select * into r from public.bambu_retos where id = p_id for update;
  if not found or not (yo = any(r.participantes)) then raise exception 'Ese reto no existe.' using errcode = '42501'; end if;
  if r.marcas ? yo::text then raise exception 'Ya pusiste tu marca.' using errcode = '23505'; end if;
  if r.creado < now() - interval '48 hours' then raise exception 'El reto ya venció.' using errcode = '23514'; end if;
  if not public.bambu_reto_valido(r.tipo, r.ejercicio, p_marca) then raise exception 'Marca no válida.' using errcode = '23514'; end if;
  update public.bambu_retos set marcas = marcas || jsonb_build_object(yo::text, p_marca), movido = now() where id = p_id;
end;
$$;

create function public.bambu_salir_reto(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  r public.bambu_retos;
begin
  if yo is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  select * into r from public.bambu_retos where id = p_id for update;
  if not found or not (yo = any(r.participantes)) then return; end if;
  if r.de = yo or cardinality(r.participantes) <= 2 then
    delete from public.bambu_retos where id = p_id;
  else
    update public.bambu_retos set participantes = array_remove(participantes, yo), marcas = marcas - yo::text, movido = now() where id = p_id;
  end if;
end;
$$;

revoke all on function public.bambu_crear_reto(uuid[], text, text, integer), public.bambu_marcar_reto(uuid, integer), public.bambu_salir_reto(uuid) from public, anon;
grant execute on function public.bambu_crear_reto(uuid[], text, text, integer), public.bambu_marcar_reto(uuid, integer), public.bambu_salir_reto(uuid) to authenticated, service_role;

commit;
