-- v12: buscar a un amigo por su apodo.
-- Aditiva: una función nueva, no toca tablas ni políticas. Se revierte con
--   drop function public.bambu_buscar_por_apodo(text);
-- Privacidad (app que usa un menor): sigue sin existir un listado de desconocidos. Solo coincide el
-- apodo EXACTO (sin importar mayúsculas ni espacios de más), máximo 5, y la amistad sigue pidiendo
-- que el otro acepte. Devuelve lo mismo que ya da buscar por código, más el código para pedir amistad.
create or replace function public.bambu_buscar_por_apodo(p_apodo text)
returns table(apodo text, avatar integer, codigo text)
language plpgsql stable security definer set search_path = '' as $$
declare
  q text := lower(regexp_replace(btrim(coalesce(p_apodo, '')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Inicia sesión para continuar.' using errcode = '28000'; end if;
  if length(q) < 2 or length(q) > 24 then return; end if;
  return query select p.apodo, p.avatar, p.codigo_amigo from public.bambu_perfiles p
    where lower(regexp_replace(btrim(p.apodo), '\s+', ' ', 'g')) = q and p.user_id <> auth.uid()
    order by p.updated_at desc limit 5;
end;
$$;
revoke all on function public.bambu_buscar_por_apodo(text) from public, anon;
grant execute on function public.bambu_buscar_por_apodo(text) to authenticated;
