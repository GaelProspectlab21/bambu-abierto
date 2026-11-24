/**
 * Pausa antes de las apps (estilo Opal, sin app nativa).
 *
 * Cómo funciona: una automatización de Atajos de iOS ("Al abrir Instagram") abre este enlace en
 * Safari con tu llave, igual que una etiqueta NFC. Bambú te para unos segundos, te pregunta a qué
 * venías y anota el resultado en tu cuenta. Si eliges entrar, el botón corre el atajo "Bambú Pase",
 * que guarda la hora de vencimiento y abre la app: mientras el pase sigue vivo, la automatización
 * no vuelve a frenarte (así no hay ciclo infinito).
 *
 * Se guarda como actividad 'other' con nota "Pausa: ...", igual que el rescate: no cambia la forma
 * de ningún registro.
 */
import { makeId, type Activity, type AppData } from './model'

export const PAUSE_PREFIX = 'Pausa:'
export type PauseApp = { id: string; name: string; scheme: string }
export const PAUSE_APPS: PauseApp[] = [
  { id: 'youtube', name: 'YouTube', scheme: 'youtube://' },
  { id: 'instagram', name: 'Instagram', scheme: 'instagram://' },
  { id: 'tiktok', name: 'TikTok', scheme: 'snssdk1233://' },
  { id: 'x', name: 'X', scheme: 'twitter://' },
  { id: 'whatsapp', name: 'WhatsApp', scheme: 'whatsapp://' },
  { id: 'snapchat', name: 'Snapchat', scheme: 'snapchat://' },
  { id: 'juegos', name: 'tus juegos', scheme: '' },
]
export const PASS_MINUTES = [5, 10, 15] as const
export type PauseOutcome = { kind: 'resistida' } | { kind: 'pase'; minutes: number }

export function pauseApp(id: string | null | undefined): PauseApp {
  return PAUSE_APPS.find(a => a.id === id) ?? { id: 'otra', name: 'esa app', scheme: '' }
}

/** `o=r` resististe, `o=p10` pase de 10 minutos. Cualquier otra cosa no anota nada. */
export function parseOutcome(o: string | null): PauseOutcome | undefined {
  if (o === 'r') return { kind: 'resistida' }
  const m = /^p(\d{1,2})$/.exec(o ?? '')
  const minutes = m ? Number(m[1]) : 0
  return (PASS_MINUTES as readonly number[]).includes(minutes) ? { kind: 'pase', minutes } : undefined
}

export function pauseNote(app: PauseApp, outcome: PauseOutcome): string {
  return `${PAUSE_PREFIX} ${app.id} · ${outcome.kind === 'resistida' ? 'resistida' : `pase ${outcome.minutes} min`}`
}

export function pauseActivity(day: string, app: PauseApp, outcome: PauseOutcome): Activity {
  return { id: `pause:${makeId()}`, day, kind: 'other', note: pauseNote(app, outcome) }
}

export type PauseStats = { total: number; resisted: number }
export function pauseStats(data: AppData, day: string): PauseStats {
  const rows = data.activities.filter(a => a.day === day && a.kind === 'other' && a.note?.startsWith(PAUSE_PREFIX))
  return { total: rows.length, resisted: rows.filter(a => a.note?.endsWith('resistida')).length }
}

/** Fricción que crece: cada vez que vuelves el mismo día, la respiración dura más (tope 20 s). */
export function breathSeconds(opensToday: number): number {
  return Math.min(20, 5 + 3 * Math.max(0, opensToday))
}

/** El enlace del botón "Entrar": corre el atajo Bambú Pase con "minutos|esquema". */
export function passShortcutUrl(app: PauseApp, minutes: number): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent('Bambú Pase')}&input=text&text=${encodeURIComponent(`${minutes}|${app.scheme}`)}`
}

/** Cambios de un toque en vez de la app. El primero arranca tu lectura con la misma llave. */
export const SWAPS = [
  { id: 'leer', title: 'Leer 5 minutos', text: 'Abre tu libro. Cinco minutos ya cuentan como día leído.' },
  { id: 'lagartijas', title: '10 lagartijas', text: 'Ahí mismo. La sangre se mueve y las ganas de scrollear bajan.' },
  { id: 'ventana', title: 'Un minuto sin pantalla', text: 'Mira por la ventana o sal al patio. Respira lento.' },
  { id: 'mensaje', title: 'Escríbele a alguien', text: 'Un mensaje de verdad a alguien que quieres. Eso sí conecta.' },
] as const
