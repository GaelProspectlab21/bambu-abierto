// bambu-remind: manda los recordatorios push de Bambú.
//
// Dos maneras de llamarla:
//  - pg_cron cada 5 min con la cabecera x-bambu-cron (secreto en Vault y en los secretos de la función).
//  - La app, con la sesión del usuario y {"test": true}, para el botón "Probar aviso".
//
// La decisión de qué mandar sale de core.js, que es src/lib/reminders.ts empaquetado
// (pnpm build:remind). No edites core.js a mano.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
// @ts-types="../_shared/core.d.ts"
import { applyRecords, cleanSettings, dueKinds, dueNotes, EMPTY_DATA, testNote } from '../_shared/core.js'

type Note = { kind: string; key: string; title: string; body: string; url: string }
type RecordRow = { collection: string; id: string; payload: Record<string, unknown>; deleted: boolean; clientUpdatedAt: number }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('BAMBU_CRON_SECRET')!
webpush.setVapidDetails('https://bambu-personal-gael.vercel.app', Deno.env.get('BAMBU_VAPID_PUBLIC')!, Deno.env.get('BAMBU_VAPID_PRIVATE')!)
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string; tz: string }

/** La hora de pared del usuario como si fuera UTC: así los getters locales (UTC aquí) dan su hora. */
function wallClock(tz: string, now = Date.now()): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(now)).map(p => [p.type, p.value]))
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
}

async function rowsOf(userId: string, collection?: string): Promise<RecordRow[]> {
  const out: RecordRow[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from('bambu_records').select('collection,id,payload,deleted,client_updated_at').eq('user_id', userId).eq('deleted', false)
    if (collection) q = q.eq('collection', collection)
    const { data, error } = await q.order('seq').range(from, from + 999)
    if (error) throw new Error(`records: ${error.message}`)
    for (const r of data ?? []) out.push({ collection: r.collection, id: r.id, payload: r.payload ?? {}, deleted: r.deleted, clientUpdatedAt: Number(r.client_updated_at) })
    if (!data || data.length < 1000) return out
  }
}

async function send(subs: Sub[], note: Note): Promise<{ endpoint: string; status: number | string }[]> {
  const payload = JSON.stringify({ title: note.title, body: note.body, url: note.url, tag: note.kind })
  return Promise.all(subs.map(async sub => {
    try {
      const res = await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 3600, urgency: 'high' })
      await db.from('bambu_push_subs').update({ last_ok_at: new Date().toISOString(), failures: 0 }).eq('endpoint', sub.endpoint)
      return { endpoint: new URL(sub.endpoint).host, status: res.statusCode }
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      // 404/410: el teléfono ya no existe o quitó el permiso. Se borra el buzón.
      if (status === 404 || status === 410) await db.from('bambu_push_subs').delete().eq('endpoint', sub.endpoint)
      console.error('push falló', new URL(sub.endpoint).host, status, (error as Error).message)
      return { endpoint: new URL(sub.endpoint).host, status: status ?? 'error' }
    }
  }))
}

async function runCron() {
  const { data: subs, error } = await db.from('bambu_push_subs').select('endpoint,user_id,p256dh,auth,tz')
  if (error) throw new Error(`subs: ${error.message}`)
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  const report: unknown[] = []
  for (const [userId, list] of byUser) {
    const now = wallClock(list[0].tz)
    // Paso barato primero: solo los ajustes. Si a esta hora no toca nada, no se carga el historial.
    const meta = await rowsOf(userId, 'meta')
    const settings = cleanSettings(meta.find(r => r.id === 'settings')?.payload.value)
    if (!dueKinds(settings.reminders, settings.sleepTarget, now).length) continue
    const data = applyRecords({ ...EMPTY_DATA }, await rowsOf(userId))
    for (const note of dueNotes(data, now)) {
      // Se apunta ANTES de enviar: si dos corridas se cruzan, solo una gana la fila.
      const { data: claimed, error: logError } = await db.from('bambu_push_log').insert({ user_id: userId, key: note.key }).select('key')
      if (logError?.code === '23505') continue
      if (logError) throw new Error(`log: ${logError.message}`)
      if (!claimed?.length) continue
      const results = await send(list, note)
      report.push({ key: note.key, results })
      // Si NINGÚN teléfono lo recibió por un fallo pasajero (red, 5xx, 429), se suelta la reserva
      // y la siguiente corrida lo vuelve a intentar mientras siga tocando. Antes la reserva se
      // quedaba y el aviso se perdía. 404/410 no cuentan: ese buzón ya se borró.
      const delivered = results.some(r => r.status === 200 || r.status === 201)
      const transient = results.some(r => typeof r.status !== 'number' || r.status === 429 || r.status >= 500)
      if (!delivered && transient) {
        const { error: releaseError } = await db.from('bambu_push_log').delete().eq('user_id', userId).eq('key', note.key)
        if (releaseError) console.error('no se pudo soltar la reserva', note.key, releaseError.message)
      }
    }
  }
  return { users: byUser.size, sent: report }
}

async function runTest(jwt: string) {
  const { data: user, error } = await db.auth.getUser(jwt)
  if (error || !user.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  const { data: subs } = await db.from('bambu_push_subs').select('endpoint,user_id,p256dh,auth,tz').eq('user_id', user.user.id)
  if (!subs?.length) return Response.json({ sent: 0, results: [] })
  const results = await send(subs as Sub[], testNote())
  return Response.json({ sent: results.filter(r => r.status === 201 || r.status === 200).length, results })
}

const ORIGINS = ['https://bambu-personal-gael.vercel.app', 'http://localhost:4173', 'http://localhost:5173']
function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
}

Deno.serve(async req => {
  const CORS = cors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (new Date().getTimezoneOffset() !== 0) return new Response('runtime fuera de UTC', { status: 500 })
  try {
    if (CRON_SECRET && req.headers.get('x-bambu-cron') === CRON_SECRET) return Response.json(await runCron())
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!jwt) return new Response('unauthorized', { status: 401, headers: CORS })
    const res = await runTest(jwt)
    Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
