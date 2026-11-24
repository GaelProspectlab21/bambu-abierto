-- Bambú para amigos: registro solo con código de invitación, permisos por cuenta y tope de Jev.
--
-- Aditiva: no toca bambu_records ni ninguna tabla existente.
-- Quién es dueño (crea invitaciones y usa Jev) NO está escrito aquí: se inserta aparte en
-- bambu_admins, como dato. La puerta real de Jev es además el secreto JEV_ALLOWED_UIDS.

-- ── Dueños de la app ────────────────────────────────────────────────────
create table if not exists public.bambu_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  jev boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.bambu_admins enable row level security;
alter table public.bambu_admins force row level security;
revoke all on table public.bambu_admins from anon, authenticated;

-- ── Invitaciones: cada código sirve una vez y caduca a los 30 días ──────
create table if not exists public.bambu_invites (
  code text primary key,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  -- Sin llave foránea: se llena en el BEFORE INSERT de auth.users, cuando el usuario aún no existe.
  used_by uuid,
  used_at timestamptz,
  constraint bambu_invites_code check (code ~ '^[A-Z0-9]{8}$')
);
alter table public.bambu_invites enable row level security;
alter table public.bambu_invites force row level security;
revoke all on table public.bambu_invites from anon, authenticated;

create or replace function public.bambu_create_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_code text;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.bambu_admins where user_id = uid) then
    raise exception 'Solo la cuenta dueña crea invitaciones' using errcode = '42501';
  end if;
  -- Tope sano: 25 códigos vivos sin usar.
  if (select count(*) from public.bambu_invites where created_by = uid and used_by is null and expires_at > now()) >= 25 then
    raise exception 'Ya tienes 25 invitaciones sin usar' using errcode = 'P0001';
  end if;
  loop
    -- Sin 0, O, 1 ni I para que se dicte sin confusiones.
    new_code := (select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 8));
    exit when not exists (select 1 from public.bambu_invites where code = new_code);
  end loop;
  insert into public.bambu_invites (code, created_by) values (new_code, uid);
  return new_code;
end;
$$;
revoke all on function public.bambu_create_invite() from public, anon;
grant execute on function public.bambu_create_invite() to authenticated;

-- ── Lo que cada cuenta puede ver en la interfaz ────────────────────────
create or replace function public.bambu_account_capabilities()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invitations', exists (select 1 from public.bambu_admins where user_id = (select auth.uid())),
    'jev', coalesce((select jev from public.bambu_admins where user_id = (select auth.uid())), false)
  );
$$;
revoke all on function public.bambu_account_capabilities() from public, anon;
grant execute on function public.bambu_account_capabilities() to authenticated;

-- ── La puerta del registro ─────────────────────────────────────────────
-- signUp solo puede escribir user_metadata. app_metadata solo lo pone la API de administración,
-- así que 'bambu_admin_created' no se puede falsificar desde el navegador.
create or replace function public.bambu_check_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  given text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'invitation_code', '')));
  found_code text;
begin
  if coalesce(new.raw_app_meta_data ->> 'bambu_admin_created', '') = 'true' then
    return new;
  end if;
  select code into found_code from public.bambu_invites
    where code = given and used_by is null and expires_at > now()
    for update;
  if found_code is null then
    raise exception 'Invitación inválida o ya usada' using errcode = 'P0001';
  end if;
  update public.bambu_invites set used_by = new.id, used_at = now() where code = found_code;
  new.raw_user_meta_data := new.raw_user_meta_data - 'invitation_code';
  return new;
end;
$$;
revoke all on function public.bambu_check_invite() from public, anon, authenticated;

drop trigger if exists bambu_check_invite on auth.users;
create trigger bambu_check_invite before insert on auth.users
  for each row execute function public.bambu_check_invite();

-- ── Tope diario de Jev (la función lo cuenta con service_role) ─────────
create table if not exists public.bambu_jev_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  primary key (user_id, day)
);
alter table public.bambu_jev_usage enable row level security;
alter table public.bambu_jev_usage force row level security;
revoke all on table public.bambu_jev_usage from anon, authenticated;

create or replace function public.bambu_jev_tick(p_user uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.bambu_jev_usage (user_id, day, calls) values (p_user, (now() at time zone 'America/Mexico_City')::date, 1)
  on conflict (user_id, day) do update set calls = public.bambu_jev_usage.calls + 1
  returning calls;
$$;
revoke all on function public.bambu_jev_tick(uuid) from public, anon, authenticated;
grant execute on function public.bambu_jev_tick(uuid) to service_role;
