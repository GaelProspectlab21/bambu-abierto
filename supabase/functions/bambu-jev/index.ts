// bambu-jev: Jev (TypeSafe, vía OpenRouter) clasifica tus tareas para armar un bloque de enfoque.
//
// Jev NO escribe nada: por cada tarea decide dos cosas cerradas, el nivel (n1 a n4) y el tamaño
// (rápida, 25, 45, 90 min o 2 h o más). La app revisa con una regla local si esto falla, así
// que Jev solo quita fricción, nunca es requisito.
//
// Qué sale de tu cuenta: el texto (y las notas) de las tareas que elegiste, a OpenRouter/TypeSafe.
// Requiere sesión (la verificación de JWT de Supabase queda ENCENDIDA) y el secreto
// OPENROUTER_API_KEY en las variables de la función.
//
// Solo para las cuentas en el secreto JEV_ALLOWED_UIDS (separadas por coma): sus criterios son de
// negocio (vender, prospectar) y no le sirven a nadie más. Las demás reciben 403 y la app usa su
// regla local. Tope de JEV_DAILY_CAP llamadas al día por cuenta (60 si no se define), contado en
// bambu_jev_usage, para que un bucle no vacíe el saldo de OpenRouter.
import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const ORIGINS = ['https://bambu-personal-gael.vercel.app', 'http://localhost:4173', 'http://localhost:5173']
const URL = 'https://openrouter.ai/api/alpha/decisions'
const MODEL = 'typesafe/jev-1.13'

const QUESTIONS = {
  level: {
    type: 'choice',
    instructions: "Using `task` (and `notes` if present), decide how much this task moves the person's main goal. n4: direct results such as selling, prospecting, closing, replying to a client, sending a proposal. n3: building systems that compound such as processes, content, automations, campaigns. n2: delivering commitments already made. n1: admin, errands, bills, tidying, low-value chores.",
    criteria: {
      n4: 'direct money or goal-moving work: sales, prospecting, proposals, client replies',
      n3: 'systems and content that compound: processes, campaigns, videos, automations',
      n2: 'fulfilling an existing commitment or delivery',
      n1: 'admin, errands, paying bills, cleaning, low-value chores',
    },
  },
  size: {
    type: 'score',
    instructions: 'Using `task` (and `notes` if present), estimate how long one focused session on it takes.',
    criteria: ['a quick action, under 15 minutes', 'about 25 minutes', 'about 45 minutes', 'about 90 minutes', '2 hours or more of deep work'],
  },
}

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json' }
}

async function ask(key: string, task: { id: string; text: string; notes: string }): Promise<{ id: string; level: number; size: number } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(URL, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, state: { task: task.text, ...(task.notes ? { notes: task.notes } : {}) }, questions: QUESTIONS }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => null)
    if (res && res.ok) {
      const j = await res.json() as { answers?: { level?: { choice?: string }; size?: { score?: number } } }
      const level = Number(String(j.answers?.level?.choice ?? '').replace('n', ''))
      const size = Number(j.answers?.size?.score)
      return level >= 1 && level <= 4 && Number.isFinite(size) ? { id: task.id, level, size } : null
    }
    if (res && res.status !== 429 && res.status < 500) return null
  }
  return null
}

Deno.serve(async req => {
  const h = headers(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  const fail = (status: number, error: string) => new Response(JSON.stringify({ ok: false, error }), { status, headers: h })
  try {
    const key = Deno.env.get('OPENROUTER_API_KEY')
    if (!key) return fail(503, 'Jev no está configurado')
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { data: auth } = await db.auth.getUser(jwt)
    const uid = auth.user?.id
    if (!uid) return fail(401, 'Necesitas iniciar sesión')
    const allowed = (Deno.env.get('JEV_ALLOWED_UIDS') ?? '').split(',').map(x => x.trim()).filter(Boolean)
    if (!allowed.includes(uid)) return fail(403, 'Jev no está disponible en esta cuenta')
    const { data: calls, error: tickError } = await db.rpc('bambu_jev_tick', { p_user: uid })
    if (tickError) return fail(503, 'No se pudo contar el uso de Jev')
    if (Number(calls) > Number(Deno.env.get('JEV_DAILY_CAP') ?? 60)) return fail(429, 'Jev llegó a su tope de hoy')
    const body = await req.json().catch(() => ({})) as { tasks?: unknown }
    const tasks = (Array.isArray(body.tasks) ? body.tasks : []).slice(0, 8).flatMap(t => {
      const r = t as { id?: unknown; text?: unknown; notes?: unknown }
      return typeof r.id === 'string' && typeof r.text === 'string' && r.text.trim()
        ? [{ id: r.id.slice(0, 160), text: r.text.trim().slice(0, 300), notes: typeof r.notes === 'string' ? r.notes.trim().slice(0, 300) : '' }] : []
    })
    if (!tasks.length) return fail(400, 'Sin tareas')
    const items = (await Promise.all(tasks.map(t => ask(key, t)))).filter((x): x is { id: string; level: number; size: number } => x !== null)
    return new Response(JSON.stringify({ ok: true, items }), { headers: h })
  } catch (error) {
    console.error(error)
    return fail(500, 'No se pudo consultar a Jev')
  }
})
