const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')

// Ejecuta el handler real con su transporte de datos sustituido. No accede a nube.
module.exports = async function socialEdgeChecks(moduleOf) {
  let handler, fail = false, crash = false
  const reads = []
  const key = 'abcdefghijklmnop'
  const db = {
    from(table) {
      return { select(columns) {
        return { eq(column, value) {
          return { async maybeSingle() {
            reads.push({ table, columns, column, value })
            if (crash) throw new Error('Fallo de transporte')
            if (fail) return { data: null, error: { message: 'Detalle interno privado' } }
            if (value !== key) return { data: null, error: null }
            return { error: null, data: table === 'bambu_pases'
              ? { hasta: '2099-01-01T00:00:00Z', user_id: 'secreto' }
              : { estado: { dia: '2026-11-25', rutina: 'Descanso', racha: 2, nivel: 1, xpHoy: 10, meta: 100, minutos: 5, correo: 'secreto' }, user_id: 'secreto' } }
          } }
        } }
      } }
    },
  }
  const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/bambu-llave/index.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'exports', 'Deno', code)(ref => {
    if (ref.startsWith('npm:@supabase/supabase-js@')) return { createClient: () => db }
    if (ref === './formato.ts') return moduleOf('../../supabase/functions/bambu-llave/formato')
    throw new Error('Import inesperado: ' + ref)
  }, {}, { env: { get: () => 'prueba-local' }, serve: fn => { handler = fn } })
  const request = (query, method = 'GET') => handler(new Request('https://example.test/functions/v1/bambu-llave' + query, { method }))
  const preflight = await request('', 'OPTIONS')
  assert.equal(preflight.status, 204)
  assert.equal((await request('', 'POST')).status, 405)
  for (const query of ['', '?tipo=pase&k=', '?tipo=otro&k=' + key, '?tipo=widget&k=corta']) {
    const r = await request(query)
    assert.equal(r.status, 404)
    assert.deepEqual(await r.json(), {})
    assert.equal(r.headers.get('cache-control'), 'no-store')
  }
  assert.equal(reads.length, 0, 'datos mal formados nunca consultan la base')
  for (const tipo of ['pase', 'widget']) {
    const missing = await request(`?tipo=${tipo}&k=xxxxxxxxxxxxxxxx`)
    assert.equal(missing.status, 404)
    assert.deepEqual(await missing.json(), {})
    const found = await request(`?tipo=${tipo}&k=${key}`)
    assert.equal(found.status, 200)
    const body = await found.json()
    assert.doesNotMatch(JSON.stringify(body), /user_id|secreto|correo|llave/)
    assert.deepEqual(reads.at(-1), { table: tipo === 'pase' ? 'bambu_pases' : 'bambu_widget', columns: tipo === 'pase' ? 'hasta' : 'estado', column: 'llave', value: key })
    if (tipo === 'pase') assert.deepEqual(body, { fields: { hasta: { stringValue: '2099-01-01T00:00:00.000Z' } } })
    else assert.equal(body.fields.minutos.integerValue, '5')
    assert.equal(found.headers.get('cache-control'), 'no-store')
  }
  fail = true
  const unavailable = await request('?tipo=widget&k=' + key)
  assert.equal(unavailable.status, 503)
  assert.deepEqual(await unavailable.json(), {})
  crash = true
  const thrown = await request('?tipo=pase&k=' + key)
  assert.equal(thrown.status, 503)
  assert.deepEqual(await thrown.json(), {})
}
