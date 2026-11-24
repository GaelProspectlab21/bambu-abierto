/**
 * Caja negra de la sesión.
 *
 * Por qué existe: en el iPhone Bambú pedía contraseña al abrir el ícono y no había forma de
 * saber por qué (Supabase no guarda bitácora de Auth en este proyecto). Aquí se anota, en el
 * propio teléfono, qué pasó con la sesión en cada arranque y cada renovación del token. La
 * próxima vez que entras, la app sube esas notas a `bambu_auth_events` y se borran del teléfono.
 *
 * No guarda tokens ni contraseñas: solo eventos, códigos de error y si había sesión guardada.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

let logOwner = 'signed-out'
const key = () => `bambu-auth-log:${logOwner}`
export function setAuthLogOwner(owner: string): void { logOwner = owner }
const MAX = 60
export type AuthEvent = { at: number; event: string; detail: Record<string, unknown> }

function read(): AuthEvent[] {
  try { const v = JSON.parse(localStorage.getItem(key()) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
function standalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function logAuth(event: string, detail: Record<string, unknown> = {}): void {
  try {
    const rows = [...read(), { at: Date.now(), event, detail: { ...detail, standalone: standalone(), online: navigator.onLine } }].slice(-MAX)
    localStorage.setItem(key(), JSON.stringify(rows))
  } catch { /* sin almacenamiento no hay caja negra; la app sigue */ }
}

/** fetch que anota cada intento de renovar o abrir sesión y cómo terminó. */
export function loggingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const auth = url.includes('/auth/v1/token') || url.includes('/auth/v1/logout')
  if (!auth) return fetch(input, init)
  const grant = new URL(url).searchParams.get('grant_type') ?? (url.includes('logout') ? 'logout' : '')
  return fetch(input, init).then(async res => {
    if (!res.ok) {
      const body = await res.clone().json().catch(() => ({})) as { error_code?: string; code?: string; msg?: string; error_description?: string }
      logAuth('token-error', { grant, status: res.status, code: body.error_code ?? body.code, msg: (body.msg ?? body.error_description ?? '').slice(0, 120) })
    } else if (grant === 'refresh_token' || grant === 'logout') logAuth('token-ok', { grant })
    return res
  }, (error: unknown) => {
    logAuth('token-network', { grant, msg: String(error).slice(0, 120) })
    throw error
  })
}

/** Sube las notas al entrar con sesión válida y las borra del teléfono si llegaron. */
export async function flushAuthLog(client: SupabaseClient): Promise<void> {
  const rows = read()
  if (!rows.length) return
  const { error } = await client.rpc('bambu_auth_log', { p_events: rows, p_ua: navigator.userAgent.slice(0, 300) })
  if (error) { console.warn('No se pudo subir la bitácora de sesión.', error.message); return }
  try { localStorage.setItem(key(), JSON.stringify(read().filter(r => r.at > rows[rows.length - 1].at))) } catch { /* nada */ }
}
