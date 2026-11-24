// bambu-account: descargar todos mis datos y borrar mi cuenta de verdad.
//
// Son cuentas de menores: borrar elimina el usuario y, por las llaves foráneas con cascada,
// todos sus registros, avisos, llaves NFC y bitácoras. La cuenta dueña de la app (bambu_admins)
// no se puede borrar desde aquí: un toque equivocado no debe tirar años de historial.
// Requiere sesión (verify_jwt encendido) y vuelve a comprobar el usuario con getUser.
import { createClient } from 'npm:@supabase/supabase-js@2.112.3'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const ORIGINS = ['https://bambu-personal-gael.vercel.app', 'http://localhost:4173', 'http://localhost:5173']

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json' }
}

async function all(table: string, columns: string, userId: string) {
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).eq('user_id', userId).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []) as Record<string, unknown>[])
    if (!data || data.length < 1000) return out
  }
}

Deno.serve(async req => {
  const h = headers(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h })
  try {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { data: auth, error: authError } = await db.auth.getUser(jwt)
    if (authError || !auth.user) return reply(401, { ok: false, error: 'Necesitas iniciar sesión.' })
    const user = auth.user
    const body = await req.json().catch(() => ({})) as { action?: unknown; confirmation?: unknown }

    if (body.action === 'export') {
      const [records, legacy, subs, keys, events] = await Promise.all([
        all('bambu_records', 'collection,id,payload,deleted,client_updated_at,server_updated_at', user.id),
        all('bambu_user_data', 'revision,payload,updated_at', user.id).catch(() => []),
        all('bambu_push_subs', 'tz,created_at,last_ok_at', user.id),
        all('bambu_nfc_keys', 'created_at,uses', user.id).catch(() => []),
        all('bambu_auth_events', 'at,event,detail', user.id).catch(() => []),
      ])
      return reply(200, { ok: true, exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, createdAt: user.created_at, name: user.user_metadata?.display_name ?? null },
        records, legacy, devicesWithReminders: subs, nfcKeys: keys, accessLog: events,
        note: 'Las fotos de progreso nunca salen de tu teléfono; la app las agrega a este archivo desde ahí.' })
    }

    if (body.action === 'delete') {
      if (body.confirmation !== 'BORRAR') return reply(400, { ok: false, error: 'Escribe BORRAR para confirmar.' })
      const { data: owner } = await db.from('bambu_admins').select('user_id').eq('user_id', user.id).maybeSingle()
      if (owner) return reply(403, { ok: false, error: 'La cuenta dueña de bambú no se borra desde la app.' })
      // Primero los registros (por si una cascada faltara), luego el usuario: lo demás cae en cascada.
      const { error: recError } = await db.from('bambu_records').delete().eq('user_id', user.id)
      if (recError) throw new Error(`records: ${recError.message}`)
      const { error: delError } = await db.auth.admin.deleteUser(user.id)
      if (delError) throw new Error(`deleteUser: ${delError.message}`)
      return reply(200, { ok: true, deleted: true })
    }

    return reply(400, { ok: false, error: 'Acción desconocida.' })
  } catch (error) {
    console.error(error)
    return reply(500, { ok: false, error: 'No se pudo completar. Intenta de nuevo.' })
  }
})
