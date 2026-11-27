"""Prueba de seguridad de retos y caja de fallos (v11), contra PRODUCCIÓN, sin dejar rastro.

Todo corre en UN bloque DO que crea tres cuentas temporales (A y B amigos, C desconocido), actúa
como cada una con el rol `authenticated` y sus claims, y al final lanza una excepción a propósito:
Postgres revierte TODO. El resultado viaja en el mensaje de esa excepción.
Uso: SB_HELPER_DIR=<carpeta de sb.py> python -X utf8 scripts/prueba_retos.py
"""
import os
import re
import sys

sys.path.insert(0, os.environ['SB_HELPER_DIR'])
import sb  # noqa: E402

BLOQUE = r"""
do $t$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  r uuid; n int; ok text := ''; mal text := '';
  procedure_ok boolean;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x::text || '@prueba.invalid', '{"bambu_admin_created":"true"}', '{}', now(), now()
  from unnest(array[a, b, c]) x;
  insert into public.bambu_amistades (de, para, estado) values (a, b, 'aceptada');

  -- Como A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  r := public.bambu_crear_reto(array[b], 'reps', 'Lagartijas', 20); ok := ok || 'A crea reto con su amigo|';
  begin perform public.bambu_crear_reto(array[c], 'reps', 'Lagartijas', 20); mal := mal || 'A retó a un desconocido|'; exception when others then ok := ok || 'no se puede retar a un desconocido|'; end;
  begin perform public.bambu_crear_reto(array[b], 'reps', 'Lagartijas', 999); mal := mal || 'marca de 999 aceptada|'; exception when others then ok := ok || 'marca imposible rechazada|'; end;
  begin perform public.bambu_crear_reto(array[b], 'reps', 'Pesas', 10); mal := mal || 'ejercicio inventado aceptado|'; exception when others then ok := ok || 'ejercicio fuera de lista rechazado|'; end;
  begin insert into public.bambu_retos (de, participantes, tipo, ejercicio) values (a, array[a, c], 'reps', 'Lagartijas'); mal := mal || 'insert directo permitido|'; exception when others then ok := ok || 'sin insert directo|'; end;
  begin insert into public.bambu_fallos (user_id, donde, error) values (b, 'x', 'y'); mal := mal || 'A escribió un fallo a nombre de B|'; exception when others then ok := ok || 'fallo a nombre de otro rechazado|'; end;
  for i in 1..35 loop insert into public.bambu_fallos (user_id, donde, error) values (a, 'prueba', 'e'); end loop;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.bambu_fallos where user_id = a;
  if n = 30 then ok := ok || 'tope de 30 fallos por hora|'; else mal := mal || 'tope de fallos: ' || n || '|'; end if;

  -- Como C (desconocido)
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.bambu_retos where id = r;
  if n = 0 then ok := ok || 'C no ve el reto|'; else mal := mal || 'C ve el reto|'; end if;
  begin perform public.bambu_marcar_reto(r, 50); mal := mal || 'C marcó un reto ajeno|'; exception when others then ok := ok || 'C no puede marcar|'; end;
  delete from public.bambu_retos where id = r;
  begin select count(*) into n from public.bambu_fallos where user_id = a; mal := mal || 'C puede leer la caja de fallos|'; exception when others then ok := ok || 'la caja de fallos no se lee desde la app|'; end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.bambu_retos where id = r;
  if n = 1 then ok := ok || 'C no puede borrar|'; else mal := mal || 'C borró el reto|'; end if;

  -- Como B (amigo)
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.bambu_retos where id = r;
  if n = 1 then ok := ok || 'B ve el reto|'; else mal := mal || 'B no ve el reto|'; end if;
  perform public.bambu_marcar_reto(r, 15); ok := ok || 'B marca|';
  begin perform public.bambu_marcar_reto(r, 30); mal := mal || 'B marcó dos veces|'; exception when others then ok := ok || 'una sola marca por persona|'; end;
  begin update public.bambu_retos set marcas = '{}' where id = r; mal := mal || 'B editó marcas directo|'; exception when others then ok := ok || 'sin update directo|'; end;
  delete from public.bambu_retos where id = r;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.bambu_retos where id = r and marcas ? b::text;
  if n = 1 then ok := ok || 'B no puede borrar el reto de A|'; else mal := mal || 'B borró o perdió la marca|'; end if;

  -- Como A otra vez: borra su reto
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  delete from public.bambu_retos where id = r;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.bambu_retos where id = r;
  if n = 0 then ok := ok || 'A borra su reto|'; else mal := mal || 'A no pudo borrar su reto|'; end if;

  raise exception 'RESULTADO OK[%] MAL[%]', ok, mal;
end
$t$;
"""


def main() -> int:
    try:
        sb.sql(BLOQUE)
        print('FALLA  el bloque no lanzó su excepción final: algo quedó sin revertir')
        return 1
    except RuntimeError as e:
        m = re.search(r'RESULTADO OK\[(.*?)\] MAL\[(.*?)\]', str(e))
        if not m:
            print('FALLA  error inesperado:', str(e)[:300])
            return 1
        oks = [x for x in m.group(1).split('|') if x]
        mals = [x for x in m.group(2).split('|') if x]
        for x in oks: print('PASA  ', x)
        for x in mals: print('FALLA ', x)
        left = sb.sql("select (select count(*) from auth.users where email like '%@prueba.invalid') u, (select count(*) from public.bambu_retos) r, (select count(*) from public.bambu_fallos) f")[0]
        limpio = left['u'] == 0
        print('PASA   no quedó rastro' if limpio else f'FALLA  quedó rastro {left}')
        print(f"\n{len(oks) + limpio} pasan, {len(mals) + (not limpio)} fallan")
        return 1 if mals or not limpio else 0


sys.exit(main())
