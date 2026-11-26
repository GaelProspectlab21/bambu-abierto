// PostgreSQL real en memoria mediante PGlite. Dependencia de verificación externa
// al bundle: SOCIAL_PGLITE_PATH apunta al paquete instalado en una carpeta temporal.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { PGlite } = require(process.env.SOCIAL_PGLITE_PATH || '@electric-sql/pglite')

async function main() {
  const pg = new PGlite()
  const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', C = '00000000-0000-4000-8000-00000000000c'
  let count = 0
  const check = (name, ok) => { assert.ok(ok, name); count++; console.log('PASA ' + name) }
  async function as(uid, sql, args = []) {
    await pg.exec('set role authenticated')
    try {
      await pg.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
      return (await pg.query(sql, args)).rows
    } finally { await pg.exec('reset role') }
  }
  async function denied(uid, sql, args = []) {
    try { await as(uid, sql, args); return false } catch (e) { if (!['42501', '23514', '28000'].includes(e.code)) throw e; return true }
  }
  try {
    await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;`)
    const file = path.join(__dirname, '../supabase/migrations/20261126000000_bambu_social.sql')
    await pg.exec(fs.readFileSync(file, 'utf8'))
    await pg.query('insert into auth.users values ($1), ($2), ($3)', [A, B, C])
    for (const [uid, name] of [[A, 'Ana'], [B, 'Beto'], [C, 'Caro']]) await as(uid, 'insert into public.bambu_perfiles (user_id, apodo) values ($1, $2)', [uid, name])
    const all = (await pg.query('select * from public.bambu_perfiles')).rows
    const codeB = all.find(r => r.user_id === B).codigo_amigo
    check('perfil privado por defecto y códigos válidos', all.every(r => r.privado && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(r.codigo_amigo)))
    check('A no lee perfil de B', (await as(A, 'select * from public.bambu_perfiles where user_id=$1', [B])).length === 0)
    check('directorio vacío sin relaciones', (await as(A, 'select * from public.bambu_directorio()')).length === 0)
    check('buscar código devuelve solo apodo y avatar', JSON.stringify(await as(A, 'select * from public.bambu_buscar_por_codigo($1)', [codeB])) === JSON.stringify([{ apodo: 'Beto', avatar: 0 }]))
    check('buscar por prefijo no descubre usuarios', (await as(A, 'select * from public.bambu_buscar_por_codigo($1)', [codeB.slice(0, 7)])).length === 0)
    check('uid conocido no inicia amistad', await denied(A, 'select public.bambu_pedir_amistad($1)', [B]))
    check('no se inyecta amistad aceptada por REST', await denied(A, "insert into public.bambu_amistades(de,para,estado) values ($1,$2,'aceptada')", [A, B]))
    check('no se cambia código propio', await denied(A, "update public.bambu_perfiles set codigo_amigo='ABCDEFGH' where user_id=$1", [A]))
    await as(A, 'select public.bambu_pedir_amistad($1)', [codeB])
    check('solicitud pendiente no abre perfil', (await as(A, 'select * from public.bambu_perfiles where user_id=$1', [B])).length === 0)
    const dirs = await as(A, 'select * from public.bambu_directorio()')
    check('directorio pendiente solo identidad mínima', dirs.length === 1 && dirs[0].uid === B && dirs[0].nivel === 0 && dirs[0].actualizado === null && dirs[0].siguiendo.length === 0)
    check('remitente no acepta su propia solicitud', await denied(A, 'select public.bambu_responder_amistad($1,true)', [A]))
    check('tercero no acepta solicitud ajena', await denied(C, 'select public.bambu_responder_amistad($1,true)', [A]))
    check('no crea duelo sin amistad aceptada', await denied(A, "insert into public.bambu_duelos(de,para,ejercicio,de_reps) values ($1,$2,'Fondos',10)", [A, B]))
    await as(B, 'select public.bambu_responder_amistad($1,true)', [A])
    check('B acepta y A lee su perfil', (await as(A, 'select * from public.bambu_perfiles where user_id=$1', [B])).length === 1)
    check('C sigue sin leer A ni B', (await as(C, 'select * from public.bambu_perfiles')).length === 1)
    await as(A, "insert into public.bambu_perfiles(user_id,apodo) values ($1,'Ana nueva') on conflict(user_id) do update set user_id=excluded.user_id, apodo=excluded.apodo", [A])
    check('upsert mantiene código estable', (await as(A, 'select codigo_amigo from public.bambu_perfiles where user_id=$1', [A]))[0].codigo_amigo === all.find(r => r.user_id === A).codigo_amigo)
    check('nadie reasigna su perfil a otra cuenta', await denied(A, 'update public.bambu_perfiles set user_id=$1 where user_id=$2', [C, A]))
    check('records tiene límite real de bytes', await denied(A, 'update public.bambu_perfiles set records=$1 where user_id=$2', [JSON.stringify({ x: 'a'.repeat(9000) }), A]))
    const d = (await as(A, "insert into public.bambu_duelos(de,para,ejercicio,de_reps) values ($1,$2,'Fondos',10) returning id", [A, B]))[0].id
    check('A no responde su propio duelo', await denied(A, 'select public.bambu_responder_duelo($1,20)', [d]))
    check('C no responde duelo ajeno', await denied(C, 'select public.bambu_responder_duelo($1,20)', [d]))
    check('B no cambia campos del duelo por REST', await denied(B, 'update public.bambu_duelos set de_reps=0 where id=$1', [d]))
    check('no permite más de 300 reps', await denied(B, 'select public.bambu_responder_duelo($1,301)', [d]))
    await as(B, 'select public.bambu_responder_duelo($1,0)', [d])
    check('B responde una sola vez incluso con cero', await denied(B, 'select public.bambu_responder_duelo($1,25)', [d]))
    check('respuesta conserva puntuación del creador', (await as(A, 'select de_reps,para_reps from public.bambu_duelos where id=$1', [d]))[0].de_reps === 10)
    check('ejercicio fuera de catálogo se rechaza', await denied(A, "insert into public.bambu_duelos(de,para,ejercicio,de_reps) values ($1,$2,'Otro',10)", [A, B]))
    for (const table of ['bambu_pases', 'bambu_widget']) {
      const col = table === 'bambu_pases' ? 'hasta' : 'estado'
      const value = table === 'bambu_pases' ? '2026-11-25T18:00:00Z' : JSON.stringify({ dia: '2026-11-25' })
      await as(A, `insert into public.${table}(llave,user_id,${col}) values ($1,$2,$3)`, ['abcdefghijklmnop', A, value])
      check(table + ': B no lee llave de A', (await as(B, `select * from public.${table}`)).length === 0)
      check(table + ': B no actualiza ni borra fila ajena', (await as(B, `update public.${table} set ${col}=$1 returning *`, [value])).length === 0 && (await as(B, `delete from public.${table} returning *`)).length === 0)
      check(table + ': upsert ajeno se rechaza', await denied(B, `insert into public.${table}(llave,user_id,${col}) values ($1,$2,$3) on conflict(llave) do update set user_id=excluded.user_id,${col}=excluded.${col}`, ['abcdefghijklmnop', B, value]))
      check(table + ': dueño no transfiere llave', await denied(A, `update public.${table} set user_id=$1`, [B]))
      check(table + ': longitud inválida se rechaza', await denied(A, `insert into public.${table}(llave,user_id,${col}) values ('corta',$1,$2)`, [A, value]))
    }
    await as(A, 'select public.bambu_cancelar_amistad($1,$2)', [A, B])
    check('cancelar amistad revoca lectura al instante', (await as(A, 'select * from public.bambu_perfiles where user_id=$1', [B])).length === 0)
    await as(A, 'select public.bambu_pedir_amistad($1)', [codeB])
    await as(B, 'select public.bambu_pedir_amistad($1)', [A])
    check('peticiones cruzadas aceptan una sola relación', (await as(A, 'select * from public.bambu_amistades')).filter(r => r.estado === 'aceptada').length === 1)
    await pg.query('delete from auth.users where id=$1', [A])
    for (const table of ['bambu_perfiles', 'bambu_amistades', 'bambu_duelos', 'bambu_pases', 'bambu_widget']) {
      const predicate = ['bambu_amistades', 'bambu_duelos'].includes(table) ? 'de=$1 or para=$1' : 'user_id=$1'
      check(table + ': borrar cuenta elimina datos por cascada', (await pg.query(`select * from public.${table} where ${predicate}`, [A])).rows.length === 0)
    }
    const flags = (await pg.query("select relrowsecurity, relforcerowsecurity from pg_class where relname in ('bambu_perfiles','bambu_amistades','bambu_duelos','bambu_pases','bambu_widget')")).rows
    check('RLS habilitado y forzado en las cinco tablas', flags.length === 5 && flags.every(r => r.relrowsecurity && r.relforcerowsecurity))
    await pg.exec('set role anon')
    let blocked = false
    try { await pg.query('select * from public.bambu_buscar_por_codigo($1)', [codeB]) } catch (e) { blocked = e.code === '42501' }
    await pg.exec('reset role')
    check('anon no ejecuta búsqueda de perfiles', blocked)
    console.log(`PASS ${count} pruebas SQL sociales en PostgreSQL local`)
  } finally { await pg.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
