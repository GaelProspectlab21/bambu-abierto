/**
 * La nube de Bambú (v9): Supabase, con la MISMA forma que tenía `firebase.ts` en la versión de Kiki.
 * Así las pantallas de Ricardo no cambian: solo cambió de dónde salen los datos.
 *
 * Analogía: es un enchufe adaptador. La app de Kiki traía clavija de Firebase; este archivo
 * la conecta al contacto de Supabase, que es donde ya viven las cuentas y el historial de Gael.
 */
import type { Session } from '@supabase/supabase-js'
import type { RecordRow, Collection } from './records'
import { UpdateRequired } from './sync'
import { authStorageKey, cloudConfigured, localOnly, setLocalOnly, supabase } from './supabase'

export { localOnly, setLocalOnly }
export * from './socialPendiente'

export type Sesion = { uid: string; email: string; nombre?: string }
export type Remote = { pull: (cursor: number) => Promise<{ rows: RecordRow[]; cursor: number }>; push: (rows: RecordRow[]) => Promise<void> }

/** Hay cuenta en la nube (no es el modo sin cuenta). */
export const cuentaActiva = cloudConfigured

const PUSH_BATCH = 400
const PULL_PAGE = 1000

function client() {
  if (!supabase) throw new Error('La cuenta no está configurada en esta versión.')
  return supabase
}

function sesionDe(s: Session | null): Sesion | null {
  if (!s?.user?.id) return null
  const meta = (s.user.user_metadata ?? {}) as Record<string, unknown>
  const nombre = [meta.display_name, meta.given_name, meta.name].find(v => typeof v === 'string' && v.trim()) as string | undefined
  return { uid: s.user.id, email: s.user.email ?? '', nombre: nombre?.trim().slice(0, 40) }
}

/** La sesión que supabase-js dejó en el teléfono. Se lee sin red: así Bambú abre en modo avión. */
function leerGuardada(): Sesion | null {
  if (!authStorageKey) return null
  try { return sesionDe(JSON.parse(localStorage.getItem(authStorageKey) ?? 'null') as Session | null) } catch { return null }
}

let actual: Sesion | null = cloudConfigured ? leerGuardada() : null
const oyentes = new Set<(s: Sesion | null) => void>()
supabase?.auth.onAuthStateChange((_event, s) => {
  const next = sesionDe(s)
  const cambio = actual?.uid !== next?.uid
  actual = next
  if (cambio) oyentes.forEach(f => f(next))
})

const MENSAJES: [RegExp, string][] = [
  [/Invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
  [/Email not confirmed/i, 'Confirma tu correo desde el mensaje que te enviamos.'],
  [/rate limit/i, 'Hubo varios intentos seguidos. Espera un momento y vuelve a probar.'],
  [/invit/i, 'Ese código de invitación no sirve. Pide uno nuevo a quien te invitó.'],
  [/already registered|already exists/i, 'Ese correo ya tiene cuenta. Entra con él.'],
  [/fetch|network|Failed to/i, 'Sin conexión. Revisa tu señal y vuelve a intentar.'],
]
export function errorDeCuenta(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e ?? '')
  if (/^(La contraseña|Escribe|Ese código|Tu cuenta)/.test(text)) return text
  return MENSAJES.find(([re]) => re.test(text))?.[1] ?? 'No pudimos completar la solicitud. Revisa tus datos y vuelve a intentar.'
}

export const cuenta = {
  guardada: () => actual,
  alCambiar(f: (s: Sesion | null) => void) { oyentes.add(f); return () => { oyentes.delete(f) } },
  async crear(email: string, password: string, nombre: string, invitacion: string) {
    if (password.length < 12) throw new Error('La contraseña necesita al menos 12 caracteres.')
    if (!invitacion.trim()) throw new Error('Escribe tu código de invitación.')
    const { data, error } = await client().auth.signUp({ email, password, options: { data: { display_name: nombre.trim().slice(0, 60), invitation_code: invitacion.trim().toUpperCase() } } })
    if (error) throw error
    if (!data.session) throw new Error('Tu cuenta quedó creada. Revisa tu correo para terminar.')
  },
  async entrar(email: string, password: string) {
    const { error } = await client().auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  async recuperar(email: string) {
    const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` })
    if (error) throw error
  },
  async nuevaContrasena(password: string) {
    if (password.length < 12) throw new Error('La contraseña necesita al menos 12 caracteres.')
    const { error } = await client().auth.updateUser({ password })
    if (error) throw error
  },
  salir() { void client().auth.signOut() },
  proveedor: () => {
    try { return String((JSON.parse(localStorage.getItem(authStorageKey) ?? 'null') as Session | null)?.user?.app_metadata?.provider ?? 'email') } catch { return 'email' }
  },
  /** Borra la cuenta con la función `bambu-account` (la cuenta dueña no se borra desde la app). */
  async borrar(password: string) {
    const s = actual
    if (!s) throw new Error('Tu cuenta ya no tiene sesión. Entra otra vez.')
    if (password) await cuenta.entrar(s.email, password)
    const { error } = await client().functions.invoke('bambu-account', { body: { action: 'delete', confirmation: 'BORRAR' } })
    if (error) throw new Error('No se pudo borrar la cuenta. Revisa tu conexión y vuelve a intentar.')
    await client().auth.signOut({ scope: 'local' })
    try { localStorage.removeItem(authStorageKey) } catch { /* ya no hay sesión que limpiar */ }
  },
}

/** Supabase no pide confirmar el correo en Bambú: la invitación ya filtra (ver AGENTS.md). */
export const correoVerificado = () => true
export async function mandarVerificacion(): Promise<void> { /* no aplica en Supabase */ }
export async function revisarVerificacion(): Promise<boolean> { return true }

/** Bajar y subir registros: la misma tabla `bambu_records` y la RPC `bambu_push` de siempre. */
export function remoto(uid: string): Remote {
  return {
    async pull(cursor) {
      const rows: RecordRow[] = []
      let current = cursor
      for (;;) {
        const { data, error } = await client().from('bambu_records')
          .select('collection,id,payload,deleted,client_updated_at,seq')
          .eq('user_id', uid).gt('seq', current).order('seq', { ascending: true }).limit(PULL_PAGE)
          .abortSignal(AbortSignal.timeout(20000))
        if (error) throw new Error(`pull: ${error.message}`)
        const page = (data ?? []) as { collection: Collection; id: string; payload: Record<string, unknown>; deleted: boolean; client_updated_at: number; seq: number }[]
        page.forEach(row => rows.push({ collection: row.collection, id: row.id, payload: row.payload ?? {}, deleted: row.deleted, clientUpdatedAt: Number(row.client_updated_at) }))
        if (page.length) current = Number(page[page.length - 1].seq)
        if (page.length < PULL_PAGE) break
      }
      return { rows, cursor: current }
    },
    async push(rows) {
      for (let i = 0; i < rows.length; i += PUSH_BATCH) {
        const { error } = await client().rpc('bambu_push', { p_records: rows.slice(i, i + PUSH_BATCH) }).abortSignal(AbortSignal.timeout(25000))
        if (error?.message.includes('BAMBU_UPDATE_REQUIRED')) throw new UpdateRequired('Hay una versión nueva de Bambú.')
        if (error) throw new Error(`push: ${error.message}`)
      }
    },
  }
}
