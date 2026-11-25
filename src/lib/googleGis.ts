/**
 * Botón de Google sin pasar por el dominio de Supabase.
 *
 * Con signInWithOAuth, Google muestra "Accede a <proyecto>.supabase.co" porque ahí vuelve. Con
 * Google Identity Services el botón vive en bambú: Google muestra el dominio de bambú, nos da un
 * token firmado y Supabase solo lo valida (signInWithIdToken). El nonce evita que alguien reuse
 * un token robado: a Google le damos su huella (SHA-256) y a Supabase el original.
 */
type GoogleId = {
  initialize: (o: Record<string, unknown>) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
}
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const SRC = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleId> | null = null

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''
}

export function loadGis(timeoutMs = 8000): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => reject(new Error('gis timeout')), timeoutMs)
    script.src = SRC
    script.async = true
    script.onload = () => { window.clearTimeout(timer); window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gis vacío')) }
    script.onerror = () => { window.clearTimeout(timer); reject(new Error('gis no cargó')) }
    document.head.appendChild(script)
  }).catch(error => { loading = null; throw error })
  return loading
}

/** Nonce crudo para Supabase y su huella hexadecimal para Google. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}
