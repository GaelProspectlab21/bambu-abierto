/**
 * Etiquetas NFC. Cada etiqueta guarda solo un enlace (sin cuenta ni contraseña). Al
 * acercar el teléfono, el sistema abre el enlace y Bambú decide qué hacer según tu estado:
 * si no hay sesión la empieza, si hay una abierta la cierra. Así una sola etiqueta sirve
 * para el inicio y el final.
 */
import { parseOutcome, type PauseOutcome } from './pause'

export type NfcTag = 'reading' | 'training' | 'focus' | 'habit' | 'checkin' | 'weigh' | 'night' | 'pause' | 'cama' | 'estirar' | 'despertar'
/** `night` solo viaja en la petición al servidor (nunca en el enlace): lo que marcaste en la pantalla rápida de la noche. */
export type NfcAction = { tag: NfcTag; stretch?: { when: 'manana' | 'noche'; seconds: number }; habit?: string; night?: { capacity: number; given: number; reflection?: string }; app?: string; outcome?: PauseOutcome; wake?: { reps: number } }

export const NFC_TAGS: { tag: Exclude<NfcTag, 'habit' | 'pause'>; title: string; where: string; does: string }[] = [
  { tag: 'cama', title: 'Cama', where: 'Pegada en la cabecera de tu cama.', does: 'Al tenderla, un toque tacha Tender la cama y guarda a qué hora despertaste.' },
  { tag: 'training', title: 'Piso de entreno', where: 'En el piso donde entrenas.', does: 'Primer toque abre tu rutina de hoy. Segundo toque la cierra. Solo cuenta si registraste series. Si no lo tocas antes de tu hora límite, tus redes se bloquean.' },
  { tag: 'reading', title: 'Lectura', where: 'Pegada en tu Biblia o en el buró donde lees.', does: 'Primer toque empieza el cronómetro. Segundo toque lo para y abre tu reflexión y los capítulos.' },
  { tag: 'focus', title: 'Bloque de enfoque', where: 'En tu escritorio.', does: 'Sin bloque abierto: abre Tareas con tu siguiente tarea lista. Con bloque abierto: lo cierra.' },
  { tag: 'despertar', title: 'Despertador', where: 'No es etiqueta: es un Atajo del iPhone que se corre al detener tu alarma.', does: 'Abre Bambú con una alarma que solo se apaga cuando la cámara cuenta tus lagartijas. Si no las haces, te aviso cada 5 minutos durante una hora.' },
  { tag: 'estirar', title: 'Estiramiento', where: 'En tu cuarto, junto al tapete o la cama.', does: 'Día o noche: 8 minutos guiados que cambian cada día. De mañana movilidad, de noche estiramiento. Al terminar se guarda solo y tacha Estiramiento.' },
  { tag: 'night', title: 'Noche', where: 'En tu buró, junto a la cama.', does: 'Abre tu reflexión de la noche. Sin sesión (Safari), la registras ahí mismo: con cuánto amaneciste, cuánto diste y una línea.' },
  { tag: 'checkin', title: 'Buenos días', where: 'En tu buró o junto a la cama.', does: 'Abre el registro de la mañana: horas de sueño, energía y agujetas.' },
  { tag: 'weigh', title: 'Báscula', where: 'Pegada a la báscula del baño.', does: 'Abre el registro de peso. Juanma: pésate en ayunas y mira el promedio, nunca el día.' },
]

export function parseNfc(search: string): NfcAction | null {
  const params = new URLSearchParams(search)
  if (params.get('quick') === 'read') return { tag: 'reading' }
  const tag = params.get('nfc')
  // Pausa antes de una app (Atajos de iOS): ?nfc=pause&app=instagram, y al decidir &o=r o &o=p10.
  if (tag === 'pause') {
    const app = (params.get('app') ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    const outcome = parseOutcome(params.get('o'))
    return { tag: 'pause', app: app || 'otra', ...(outcome ? { outcome } : {}) }
  }
  if (tag === 'habit') {
    const habit = (params.get('h') ?? '').slice(0, 40)
    return habit ? { tag: 'habit', habit } : null
  }
  return tag && ['reading', 'training', 'focus', 'checkin', 'weigh', 'night', 'cama', 'estirar', 'despertar'].includes(tag) ? { tag: tag as NfcTag } : null
}

/** El enlace que se graba en la etiqueta. Con `key`, funciona aunque Safari no tenga sesión. */
export function nfcUrl(origin: string, action: NfcAction, key?: string): string {
  const url = new URL(origin)
  url.searchParams.set('nfc', action.tag)
  if (action.habit) url.searchParams.set('h', action.habit)
  if (key) url.searchParams.set('k', key)
  return url.toString()
}

/** La llave de la etiqueta, si el enlace la trae. */
export function nfcKey(search: string): string {
  const k = new URLSearchParams(search).get('k') ?? ''
  return /^[A-Za-z0-9_-]{32,64}$/.test(k) ? k : ''
}

export function clearNfcFromUrl() {
  const url = new URL(window.location.href)
  ;['nfc', 'quick', 'h', 'k', 'app', 'o'].forEach(key => url.searchParams.delete(key))
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

/** iPhone a veces abre el enlace dos veces seguidas. Ignora el mismo toque dentro de 6 segundos. */
export function isRepeatScan(action: NfcAction, now = Date.now()): boolean {
  const key = `bambu.nfc.${action.tag}.${action.habit ?? ''}`
  try {
    const last = Number(localStorage.getItem(key) ?? 0)
    localStorage.setItem(key, String(now))
    return now - last < 6000
  } catch { return false }
}
