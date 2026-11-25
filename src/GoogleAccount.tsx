import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { googleIdentityLinked, googleProviderEnabled, GOOGLE_INVITE_MESSAGE, isInviteRejection } from './lib/oauth'
import { googleClientId, loadGis, makeNonce } from './lib/googleGis'

export function GoogleAccount({ link = false, onError }: { link?: boolean; onError: (message: string) => void }) {
  const [available, setAvailable] = useState(false)
  const [linked, setLinked] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    const url = import.meta.env.VITE_SUPABASE_URL?.trim()
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    if (!url || !key || !supabase) return
    const client = supabase
    const timer = window.setTimeout(() => controller.abort(), 8000)
    void (async () => {
      try {
        const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key }, signal: controller.signal })
        if (!response.ok || !googleProviderEnabled(await response.json())) return
        if (link) {
          const result = await client.auth.getUserIdentities()
          if (result.error || !result.data) return
          if (alive) setLinked(googleIdentityLinked(result.data.identities))
        }
        if (alive) setAvailable(true)
      } catch { /* Unavailable settings never expose a nonworking provider. */ }
      finally { window.clearTimeout(timer) }
    })()
    return () => { alive = false; controller.abort(); window.clearTimeout(timer) }
  }, [link])
  // Entrar: botón oficial de Google dentro de bambú (sin el dominio de Supabase). Si no carga, botón de respaldo.
  const slot = useRef<HTMLDivElement>(null)
  const [gis, setGis] = useState<'cargando' | 'listo' | 'fallo'>(link || !googleClientId() ? 'fallo' : 'cargando')
  useEffect(() => {
    if (link || !available || gis !== 'cargando' || !supabase) return
    const client = supabase
    let alive = true
    void (async () => {
      try {
        const [id, nonce] = await Promise.all([loadGis(), makeNonce()])
        if (!alive || !slot.current) return
        id.initialize({ client_id: googleClientId(), nonce: nonce.hashed, ux_mode: 'popup', use_fedcm_for_prompt: true, context: 'signin',
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return
            setBusy(true)
            const { error } = await client.auth.signInWithIdToken({ provider: 'google', token: response.credential, nonce: nonce.raw })
            setBusy(false)
            if (error) onError(isInviteRejection(error.message) ? GOOGLE_INVITE_MESSAGE : 'No pudimos entrar con Google. Prueba con tu correo y contraseña.')
          } })
        const dark = document.documentElement.dataset.theme === 'dark'
        id.renderButton(slot.current, { type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'es-419', width: Math.min(360, slot.current.clientWidth || 320) })
        setGis('listo')
      } catch { if (alive) setGis('fallo') }
    })()
    return () => { alive = false }
  }, [link, available, gis, onError])
  if (!available || (link && linked === null)) return null
  if (link && linked) return <p role="status">Google vinculado</p>
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  async function enter() {
    if (!supabase || busy) return
    setBusy(true)
    try {
      const options = { redirectTo: window.location.origin + (link ? '/?ir=ajustes' : '') }
      const result = link
        ? await supabase.auth.linkIdentity({ provider: 'google', options })
        : await supabase.auth.signInWithOAuth({ provider: 'google', options })
      if (result.error) throw result.error
    } catch { onError(link ? 'No pudimos vincular Google. Tu cuenta sigue igual. Vuelve a intentar.' : 'No pudimos abrir Google. Puedes entrar con tu correo y contraseña.') }
    finally { setBusy(false) }
  }
  if (!link && gis !== 'fallo') return <div className="google-account">
    <div ref={slot} className="google-gis" aria-busy={busy || gis === 'cargando'} />
    {standalone && <p className="hint">En la app instalada, tu contraseña es lo más seguro. Google funciona mejor en el navegador.</p>}
  </div>
  return <div className="google-account">
    <button type="button" className="secondary-button wide" disabled={busy} aria-busy={busy} onClick={() => void enter()}>{busy ? 'Abriendo Google' : link ? 'Vincular Google' : 'Continuar con Google'}</button>
    {standalone && <p className="hint">En la app instalada, tu contraseña es lo más seguro. Google funciona mejor en el navegador.</p>}
  </div>
}
