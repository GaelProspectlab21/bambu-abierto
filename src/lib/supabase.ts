import { createClient } from '@supabase/supabase-js'
import { loggingFetch } from './authLog'
import { oauthErrorUrl } from './oauth'

// Capture before the SDK consumes the callback URL. Never render provider error text.
export const oauthReturnError = (() => {
  const result = oauthErrorUrl(window.location.href)
  if (result.error) window.history.replaceState(window.history.state, '', result.cleanHref)
  return result.error
})()

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (Boolean(url) !== Boolean(publishableKey)) {
  throw new Error('Configura juntos VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.')
}

if (url) {
  const parsedUrl = new URL(url)
  const localDevelopment = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
  if (parsedUrl.protocol !== 'https:' && !localDevelopment) {
    throw new Error('La URL de Supabase debe usar HTTPS.')
  }
}

/** Hay nube en esta versión (variables de entorno puestas). */
export const cloudAvailable = Boolean(url && publishableKey)
const LOCAL_KEY = 'bambu.local'
/** Modo sin cuenta: todo se guarda solo en este dispositivo. Para compartir Bambú sin que nadie abra cuenta. */
export function localOnly(): boolean { try { return localStorage.getItem(LOCAL_KEY) === '1' } catch { return false } }
export function setLocalOnly(on: boolean): void {
  try { if (on) localStorage.setItem(LOCAL_KEY, '1'); else localStorage.removeItem(LOCAL_KEY) } catch { /* sin almacenamiento no hay modo local que recordar */ }
}
/** Nube activa: disponible y la persona no eligió el modo sin cuenta. */
export const cloudConfigured = cloudAvailable && !localOnly()
export const supabase = cloudConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: { fetch: loggingFetch },
    })
  : null
/** Donde supabase-js guarda la sesión en el teléfono. */
export const authStorageKey = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : ''


export type AccountCapabilities = { invitations: boolean; jev: boolean }
export async function accountCapabilities(): Promise<AccountCapabilities> {
  if (!supabase) return { invitations: false, jev: false }
  try {
    const { data, error } = await supabase.rpc('bambu_account_capabilities')
    return { invitations: !error && data?.invitations === true, jev: !error && data?.jev === true }
  } catch { return { invitations: false, jev: false } }
}
