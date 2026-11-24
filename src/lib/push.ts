/**
 * Avisos push en este teléfono.
 *
 * Analogía: el navegador te da un buzón (la suscripción) y la llave para abrirlo. Bambú
 * guarda la dirección del buzón en Supabase y el servidor deja ahí los avisos a su hora.
 * En iPhone el buzón solo existe si Bambú está instalada en la pantalla de inicio (iOS 16.4+).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/** Llave pública VAPID: no es secreta, identifica al servidor que firma los avisos. */
export const VAPID_PUBLIC = 'BM5E_lNS-MoM29oh8W0RpPxvlRR9YjsGfA9mDpZwGJJMvBTcyrIRB-DqARcSBqDrxR9L-1YSDa8sFRZJkMOo30U'

export type PushState = 'on' | 'off' | 'denied' | 'install' | 'unsupported'

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
function standalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export async function pushState(): Promise<PushState> {
  if (isIOS() && !standalone()) return 'install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Pide permiso (tiene que venir de un toque), crea el buzón y lo registra en la nube. */
export async function enablePush(client: SupabaseClient): Promise<PushState> {
  const state = await pushState()
  if (state === 'install' || state === 'unsupported' || state === 'denied') return state
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) })
  const json = sub.toJSON()
  const { error } = await client.rpc('bambu_push_subscribe', {
    p_endpoint: sub.endpoint, p_p256dh: json.keys?.p256dh ?? '', p_auth: json.keys?.auth ?? '',
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  if (error) throw new Error(`No se pudo registrar el aviso: ${error.message}`)
  return 'on'
}

export async function disablePush(client: SupabaseClient): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await client.rpc('bambu_push_unsubscribe', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
}

/** Manda un aviso de prueba a todos tus teléfonos. Devuelve cuántos lo recibieron. */
export async function testPush(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.functions.invoke('bambu-remind', { body: { test: true } })
  if (error) throw new Error(error.message)
  return Number((data as { sent?: number })?.sent ?? 0)
}
