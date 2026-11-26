"""Prueba social contra producción, después de aplicar la migración y desplegar bambu-llave.

Uso: python -X utf8 scripts/prueba_social.py
SB_HELPER_DIR apunta al ayudante sb.py de Management API ya configurado.
Este script no abre archivos .env ni imprime claves, sesiones o llaves privadas.
Crea dos cuentas por signup con invitación y limpia por correo exacto incluso si
signup termina en el servidor pero se pierde su respuesta por un fallo de red.
"""
import concurrent.futures
import importlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

GAEL = '00000000-0000-0000-0000-000000000000'
TABLES = ('bambu_perfiles', 'bambu_amistades', 'bambu_duelos', 'bambu_pases', 'bambu_widget')


def main():
    helper = os.environ.get('SB_HELPER_DIR')
    if not helper or not (Path(helper) / 'sb.py').is_file():
        print('FALTA SB_HELPER_DIR con el ayudante sb.py ya configurado. No se cambió producción.')
        return 2
    sys.path.insert(0, helper)
    sb = importlib.import_module('sb')
    url = f'https://{sb.REF}.supabase.co'
    keys = {k['name']: k['api_key'] for k in sb.mgmt('/api-keys?reveal=true')}
    anon, service = keys['anon'], keys['service_role']
    failures, passes = [], []

    def check(name, ok):
        (passes if ok else failures).append(name)
        print(('PASA  ' if ok else 'FALLA ') + name)
        return ok

    def http(method, route, jwt=None, body=None, admin=False, anonymous=False, upsert=False):
        headers = {'Content-Type': 'application/json', 'User-Agent': 'bambu-social-test'}
        if not anonymous:
            key = service if admin else anon
            headers.update({'apikey': key, 'Authorization': f'Bearer {jwt or key}'})
        if route.startswith('/rest/'):
            headers['Prefer'] = ('resolution=merge-duplicates,' if upsert else '') + 'return=representation'
        req = urllib.request.Request(url + route, method=method, headers=headers,
                                     data=json.dumps(body).encode() if body is not None else None)
        # No reintentar mutaciones: una respuesta perdida no prueba que no se aplicaron.
        try:
            with urllib.request.urlopen(req, timeout=40) as response:
                raw = response.read().decode()
                return response.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            raw = error.read().decode()
            try:
                return error.code, json.loads(raw) if raw else None
            except ValueError:
                return error.code, None

    def rpc(name, user, body):
        return http('POST', '/rest/v1/rpc/' + name, user['jwt'], body)

    def rows(table, user, query='select=*'):
        status, data = http('GET', '/rest/v1/' + table + '?' + query, user['jwt'])
        if status != 200 or not isinstance(data, list):
            raise RuntimeError('No se pudo leer la tabla de prueba.')
        return data

    # Fallar antes de crear cuentas si falta el esquema. No se aplica aquí.
    schema = sb.sql("select " + ', '.join(f"to_regclass('public.{t}') is not null as {t}" for t in TABLES))[0]
    if not all(schema.values()):
        print('FALTA aplicar la migración social. No se crearon cuentas ni se aplicó SQL de esquema.')
        return 2
    tag = uuid.uuid4().hex
    emails = {name: f'prueba-social-{name.lower()}-{tag}@example.com' for name in ('A', 'B')}
    codes = ['S' + tag[:7].upper(), 'T' + tag[:7].upper()]
    users = {}
    before = sb.sql(f"select count(*) n, max(seq) s from public.bambu_records where user_id='{GAEL}'")[0]
    email_sql = ','.join("'" + e + "'" for e in emails.values())
    try:
        sb.sql(f"insert into public.bambu_invites(code,created_by) values ('{codes[0]}','{GAEL}'),('{codes[1]}','{GAEL}')")
        password = 'Prueba-social-' + uuid.uuid4().hex
        for name, code in zip(('A', 'B'), codes):
            status, data = http('POST', '/auth/v1/signup', body={
                'email': emails[name], 'password': password,
                'data': {'display_name': name, 'invitation_code': code.lower()},
            })
            if not check('registro real con invitación de ' + name, status == 200 and isinstance(data, dict) and bool(data.get('access_token'))):
                raise RuntimeError('Falló el registro.')
            users[name] = {'id': data['user']['id'], 'jwt': data['access_token']}
        a, b = users['A'], users['B']
        for name, user in users.items():
            status, _ = http('POST', '/rest/v1/bambu_perfiles', user['jwt'], {'user_id': user['id'], 'apodo': 'Prueba ' + name})
            if not check('publicar perfil de ' + name, status == 201):
                raise RuntimeError('Falló la publicación del perfil.')
        bp = rows('bambu_perfiles', b, 'select=*&user_id=eq.' + b['id'])[0]
        check('perfil privado por defecto', bp['privado'] is True)
        check('A no lee perfil de B sin amistad', rows('bambu_perfiles', a, 'select=*&user_id=eq.' + b['id']) == [])
        status, data = rpc('bambu_directorio', a, {})
        check('no hay directorio abierto', status == 200 and data == [])
        status, data = rpc('bambu_buscar_por_codigo', a, {'p_codigo': bp['codigo_amigo']})
        check('búsqueda exacta devuelve solo apodo y avatar', status == 200 and data == [{'apodo': 'Prueba B', 'avatar': 0}])
        status, data = rpc('bambu_buscar_por_codigo', a, {'p_codigo': bp['codigo_amigo'][:7]})
        check('prefijo de código no busca usuarios', status == 200 and data == [])
        status, _ = http('POST', '/rest/v1/rpc/bambu_buscar_por_codigo', body={'p_codigo': bp['codigo_amigo']})
        check('sin sesión no se busca por código', 400 <= status < 500)
        status, _ = rpc('bambu_pedir_amistad', a, {'p_para': b['id']})
        check('uid sin código no inicia amistad', 400 <= status < 500)
        status, _ = rpc('bambu_pedir_amistad', a, {'p_para': bp['codigo_amigo']})
        check('A pide amistad por código', status in (200, 204))
        check('solicitud pendiente no abre perfil', rows('bambu_perfiles', a, 'select=*&user_id=eq.' + b['id']) == [])
        status, data = rpc('bambu_directorio', a, {})
        check('directorio pendiente minimiza los datos', status == 200 and len(data) == 1 and data[0]['uid'] == b['id'] and data[0]['nivel'] == 0 and data[0]['actualizado'] is None)
        status, _ = rpc('bambu_responder_amistad', a, {'p_de': a['id'], 'p_aceptar': True})
        check('A no acepta su propia solicitud', 400 <= status < 500)
        status, _ = rpc('bambu_responder_amistad', b, {'p_de': a['id'], 'p_aceptar': True})
        check('B acepta solicitud', status in (200, 204))
        check('A ya lee perfil de B', len(rows('bambu_perfiles', a, 'select=*&user_id=eq.' + b['id'])) == 1)
        status, data = http('POST', '/rest/v1/bambu_duelos', a['jwt'], {'de': a['id'], 'para': b['id'], 'ejercicio': 'Lagartijas', 'de_reps': 12})
        if not check('A crea duelo', status == 201 and bool(data)):
            raise RuntimeError('Falló la creación del duelo.')
        duel = data[0]['id']
        status, _ = rpc('bambu_responder_duelo', a, {'p_id': duel, 'p_reps': 30})
        check('A no contesta el duelo que creó', 400 <= status < 500)
        status, _ = http('PATCH', '/rest/v1/bambu_duelos?id=eq.' + duel, b['jwt'], {'de_reps': 0})
        check('B no cambia puntuación del creador por REST', 400 <= status < 500)
        status, _ = rpc('bambu_responder_duelo', b, {'p_id': duel, 'p_reps': 301})
        check('más de 300 reps se rechaza', 400 <= status < 500)
        status, _ = rpc('bambu_responder_duelo', b, {'p_id': duel, 'p_reps': 0})
        check('B contesta con cero una vez', status in (200, 204))
        status, _ = rpc('bambu_responder_duelo', b, {'p_id': duel, 'p_reps': 20})
        check('segunda respuesta falla', 400 <= status < 500)
        saved = rows('bambu_duelos', a, 'select=*&id=eq.' + duel)[0]
        check('segunda respuesta no cambia el resultado', saved['de_reps'] == 12 and saved['para_reps'] == 0 and saved['estado'] == 'listo')
        # Dos peticiones simultáneas comprueban el UPDATE atómico del servidor.
        status, data = http('POST', '/rest/v1/bambu_duelos', a['jwt'], {'de': a['id'], 'para': b['id'], 'ejercicio': 'Fondos', 'de_reps': 5})
        if status != 201:
            raise RuntimeError('Falló el duelo concurrente.')
        race = data[0]['id']
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(lambda n: rpc('bambu_responder_duelo', b, {'p_id': race, 'p_reps': n})[0], [11, 22]))
        check('dos respuestas concurrentes solo guardan una', sum(s in (200, 204) for s in outcomes) == 1 and sum(400 <= s < 500 for s in outcomes) == 1)
        widget = {'dia': time.strftime('%Y-%m-%d'), 'racha': 2, 'nivel': 1, 'xpHoy': 15, 'meta': 100, 'minutos': 5, 'rutina': 'Descanso'}
        for kind, table, payload in [('pase', 'bambu_pases', {'hasta': '2099-01-01T00:00:00Z'}), ('widget', 'bambu_widget', {'estado': widget})]:
            key = uuid.uuid4().hex
            status, _ = http('POST', '/rest/v1/' + table, a['jwt'], {'llave': key, 'user_id': a['id'], **payload})
            check('A guarda ' + kind, status == 201)
            route = '/rest/v1/' + table + '?llave=eq.' + key
            snapshot = rows(table, a, 'select=*&llave=eq.' + key)
            check('B no lee ' + kind + ' de A', rows(table, b, 'select=*&llave=eq.' + key) == [])
            status, _ = http('PATCH', route, b['jwt'], {'user_id': b['id']})
            http('DELETE', route, b['jwt'])
            check('B no cambia ni borra ' + kind + ' ajeno', rows(table, a, 'select=*&llave=eq.' + key) == snapshot)
            status, _ = http('POST', '/rest/v1/' + table + '?on_conflict=llave', b['jwt'], {'llave': key, 'user_id': b['id'], **payload}, upsert=True)
            check('upsert de B no toma ' + kind + ' ajeno', 400 <= status < 500 and rows(table, a, 'select=*&llave=eq.' + key) == snapshot)
            status, _ = http('PATCH', route, a['jwt'], {'user_id': b['id']})
            check('A no transfiere ' + kind + ' a B', 400 <= status < 500)
            status, _ = http('GET', route)
            check('anon no lee tabla ' + kind, status >= 400)
            endpoint = '/functions/v1/bambu-llave?' + urllib.parse.urlencode({'tipo': kind, 'k': key})
            status, public = http('GET', endpoint, anonymous=True)
            expected = {'fields': {'hasta': {'stringValue': '2099-01-01T00:00:00.000Z'}}} if kind == 'pase' else {
                'fields': {k: {'integerValue': str(v)} if isinstance(v, int) else {'stringValue': v} for k, v in widget.items()}}
            check('llave de ' + kind + ' funciona sin sesión y solo revela lo mínimo', status == 200 and public == expected)
        for query in ('tipo=pase&k=', 'tipo=widget&k=' + uuid.uuid4().hex, 'tipo=pase&k=' + uuid.uuid4().hex, 'tipo=perfil&k=' + uuid.uuid4().hex):
            status, public = http('GET', '/functions/v1/bambu-llave?' + query, anonymous=True)
            check('llave falsa o vacía devuelve 404 sin detalle', status == 404 and public == {})
        # Borrar A por el camino de la app debe limpiar también relaciones con B.
        status, _ = http('POST', '/functions/v1/bambu-account', a['jwt'], {'action': 'delete', 'confirmation': 'BORRAR'})
        check('borrar cuenta por la función real', status == 200)
        for table in TABLES:
            predicate = f"de='{a['id']}' or para='{a['id']}'" if table in ('bambu_amistades', 'bambu_duelos') else f"user_id='{a['id']}'"
            left = sb.sql(f'select count(*) n from public.{table} where {predicate}')[0]['n']
            check('borrar cuenta elimina ' + table, left == 0)
        check('borrar A conserva perfil de B', len(rows('bambu_perfiles', b, 'select=*&user_id=eq.' + b['id'])) == 1)
    except Exception as error:
        # Los mensajes de bibliotecas pueden incluir peticiones o secretos.
        check('ejecución completa (' + type(error).__name__ + ')', False)
    finally:
        # La consulta por correos recupera cuentas incluso si signup perdió la respuesta.
        cleanup_ids = {u['id'] for u in users.values()}
        try:
            cleanup_ids.update(u['id'] for u in sb.sql(f'select id from auth.users where email in ({email_sql})'))
        except Exception:
            check('recuperar cuentas creadas para limpieza', False)
        for uid in cleanup_ids:
            try:
                status, _ = http('DELETE', '/auth/v1/admin/users/' + uid, admin=True)
                check('limpieza de cuenta desechable', status in (200, 204, 404))
            except Exception:
                check('limpieza de cuenta desechable', False)
        try:
            sb.sql(f"delete from public.bambu_invites where code in ('{codes[0]}','{codes[1]}')")
            check('no quedan cuentas de la prueba', sb.sql(f'select count(*) n from auth.users where email in ({email_sql})')[0]['n'] == 0)
            after = sb.sql(f"select count(*) n, max(seq) s from public.bambu_records where user_id='{GAEL}'")[0]
            check('registros de Gael sin cambios', before == after)
        except Exception:
            check('limpieza final y comprobación de Gael', False)
    print(f'\n{len(passes)} pasan, {len(failures)} fallan')
    return 1 if failures else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print('FALLA preparación de la prueba: ' + type(error).__name__ + '. No se imprimen credenciales.')
        sys.exit(2)
