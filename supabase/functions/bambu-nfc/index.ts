// bambu-nfc: hace la acción de una etiqueta NFC sin sesión en el navegador.
//
// La página de Bambú, cuando se abre desde una etiqueta (?nfc=...&k=<llave>) y no hay sesión,
// manda aquí la llave y la acción. Esto busca de quién es la llave, carga sus registros, aplica
// la misma regla que la app (nfcServerAction en _shared/core.js) y guarda solo lo que cambió.
import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
// @ts-types="../_shared/core.d.ts"
import { applyRecords, diffRecords, EMPTY_DATA, nfcServerAction, parseNfc } from '../_shared/core.js'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const ORIGINS = ['https://bambu-personal-gael.vercel.app', 'http://localhost:4173', 'http://localhost:5173']
type Row = { collection: string; id: string; payload: Record<string, unknown>; deleted: boolean; clientUpdatedAt: number }

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json' }
}

function localClock(tz: string, now: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(now))
}

/** La fecha local del usuario (AAAA-MM-DD) para la hora real `now`. */
function localDay(tz: string, now: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
}

async function rowsOf(userId: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('bambu_records').select('collection,id,payload,deleted,client_updated_at')
      .eq('user_id', userId).eq('deleted', false).in('collection', ['meta', 'habit', 'set', 'checkin', 'reading', 'activity']).order('seq').range(from, from + 999)
    if (error) throw new Error(`records: ${error.message}`)
    for (const r of data ?? []) out.push({ collection: r.collection, id: r.id, payload: r.payload ?? {}, deleted: r.deleted, clientUpdatedAt: Number(r.client_updated_at) })
    if (!data || data.length < 1000) return out
  }
}

Deno.serve(async req => {
  const h = headers(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  const fail = (status: number, title: string, text: string) => new Response(JSON.stringify({ ok: false, title, text }), { status, headers: h })
  try {
    const body = await req.json().catch(() => ({})) as { k?: unknown; search?: unknown; peek?: unknown; night?: unknown; stretch?: unknown }
    const k = typeof body.k === 'string' ? body.k : ''
    const parsed = typeof body.search === 'string' ? parseNfc(body.search) : null
    const n = body.night as { capacity?: unknown; given?: unknown; reflection?: unknown } | undefined
    const night = parsed?.tag === 'night' && n && Number.isFinite(Number(n.capacity)) && Number.isFinite(Number(n.given))
      ? { capacity: Number(n.capacity), given: Number(n.given), reflection: typeof n.reflection === 'string' ? n.reflection.slice(0, 600) : undefined } : undefined
    const st = body.stretch as { when?: unknown; seconds?: unknown } | undefined
    const stretch = parsed?.tag === 'estirar' && st && (st.when === 'manana' || st.when === 'noche') && Number.isFinite(Number(st.seconds))
      ? { when: st.when as 'manana' | 'noche', seconds: Math.max(0, Math.min(1800, Number(st.seconds))) } : undefined
    const action = parsed ? { ...parsed, ...(night ? { night } : {}), ...(stretch ? { stretch } : {}) } : null
    if (k.length < 32 || k.length > 64) return fail(401, 'Etiqueta sin llave válida', 'Grábala de nuevo con el enlace de Ajustes.')
    if (!action) return fail(400, 'Etiqueta desconocida', 'Grábala de nuevo con el enlace de Ajustes.')
    const { data: owner } = await db.from('bambu_nfc_keys').select('user_id, uses').eq('key', k).maybeSingle()
    if (!owner) return fail(401, 'Esta etiqueta ya no sirve', 'Cambiaste la llave de tus etiquetas. Grábala de nuevo con el enlace de Ajustes.')
    const userId = owner.user_id as string
    const { data: sub } = await db.from('bambu_push_subs').select('tz').eq('user_id', userId).limit(1).maybeSingle()
    const now = Date.now()
    const tz = (sub?.tz as string) || 'America/Mexico_City'
    const day = localDay(tz, now)
    const data = applyRecords({ ...EMPTY_DATA }, await rowsOf(userId))
    // La pantalla rápida de la noche pide primero con qué amaneciste (no escribe nada).
    if (body.peek === true && action.tag === 'night') {
      const row = (data.checkins as { day: string; capacity?: number; given?: number; reflection?: string }[]).find(c => c.day === day)
      return new Response(JSON.stringify({ ok: true, peek: { capacity: row?.capacity ?? null, given: row?.given ?? null, reflection: row?.reflection ?? '' } }), { headers: h })
    }
    const result = nfcServerAction(data, action, now, day, localClock(tz, now))
    const rows = diffRecords(data, result.next, now)
    if (rows.length) {
      const { error } = await db.rpc('bambu_push_for', { p_user_id: userId, p_records: rows })
      if (error) throw new Error(`push: ${error.message}`)
    }
    await db.from('bambu_nfc_keys').update({ last_used_at: new Date(now).toISOString(), uses: (owner.uses as number) + 1 }).eq('user_id', userId)
    return new Response(JSON.stringify({ ok: true, title: result.title, text: result.text, open: !!result.open, locked: !!result.locked, changed: rows.length }), { headers: h })
  } catch (error) {
    console.error(error)
    return fail(500, 'No se pudo registrar', 'Revisa tu señal y vuelve a tocar la etiqueta.')
  }
})
