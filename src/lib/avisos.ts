import { borrarAvisos, guardarAvisos, type EstadoAvisos } from './firebase'

export const VAPID = 'BFR90IZW4x_kImg5LXfTV8r1dtoPgv0OzBho3Fvl0J801vGv2M9wsmI_BMXZwOz6U3ZwjK-sMCK6vbpGhe4RHE4'
export type Estado = 'on' | 'off' | 'denied' | 'install' | 'unsupported'
const SW = 'avisos-sw.js'

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const alcance = () => new URL('./', document.baseURI).href

async function registro(): Promise<ServiceWorkerRegistration | undefined> {
  return navigator.serviceWorker.getRegistration(alcance())
}

export async function estado(): Promise<Estado> {
  if (esIOS() && !instalada()) return 'install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await (await registro())?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

function bytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function activar(uid: string, hora: string, e: EstadoAvisos): Promise<Estado> {
  const antes = await estado()
  if (antes === 'install' || antes === 'unsupported' || antes === 'denied') return antes
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'denied' : 'off'
  await navigator.serviceWorker.register(new URL(SW, document.baseURI).href, { scope: alcance() })
  let reg = await registro()
  for (let i = 0; i < 20 && !reg?.active; i++) { await new Promise(r => setTimeout(r, 150)); reg = await registro() }
  if (!reg) return 'unsupported'
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(VAPID) })
  const j = sub.toJSON()
  await guardarAvisos(uid, { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' }, hora, Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City', e)
  return 'on'
}

export async function apagar(uid: string): Promise<void> {
  const sub = await (await registro())?.pushManager.getSubscription()
  await borrarAvisos(uid)
  await sub?.unsubscribe()
}
