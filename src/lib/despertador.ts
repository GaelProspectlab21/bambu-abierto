/**
 * El despertador de lagartijas. Una web no puede sonar con el teléfono bloqueado (iOS no lo deja),
 * así que son tres piezas que juntas no te dejan volver a dormir:
 * 1. La alarma de siempre del iPhone suena.
 * 2. Al detenerla, un Atajo ("Cuando se detenga la alarma") abre Bambú en ?nfc=despertar&k=<llave>.
 *    Bambú pone su propia alarma y solo la apaga cuando la cámara cuenta tus lagartijas.
 * 3. Si no las haces, bambu-remind te manda un aviso cada 5 min durante una hora.
 * Se guarda como actividad `other` con nota "Despertador: ..." para no cambiar la forma de los registros.
 */
import type { AppData } from './model'
import { WAKE_PREFIX } from './jardin'

export const DESP_PREFIX = 'Despertador:'
export const DESP_REPS = [5, 10, 15, 20] as const
export const DESP_DEFAULT = { on: false, reps: 10 }
/** Cuánto tiempo insiste el servidor después de tu hora de despertar. */
export const DESP_VENTANA = 60
export const DESP_CADA = 5

export type Despertador = { on: boolean; reps: number }
export function despertadorDe(data: Pick<AppData, 'settings'>): Despertador {
  const d = (data.settings as { despertador?: Partial<Despertador> }).despertador
  const reps = DESP_REPS.find(r => r === d?.reps) ?? DESP_DEFAULT.reps
  return { on: d?.on === true, reps }
}
export function cleanDespertador(value: unknown): Despertador | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const reps = DESP_REPS.find(r => r === v.reps) ?? DESP_DEFAULT.reps
  return { on: v.on === true, reps }
}

export const despertoHoy = (data: Pick<AppData, 'activities'>, day: string) =>
  data.activities.some(a => a.day === day && a.kind === 'other' && !!a.note?.startsWith(DESP_PREFIX))

/** Guarda que te levantaste con tus lagartijas. También deja tu hora de despertar si no había. */
export function logDespertar(data: AppData, day: string, reps: number, clock: string): AppData {
  if (despertoHoy(data, day) || !(reps > 0)) return data
  const n = Math.min(Math.round(reps), 300)
  const woke = data.activities.some(a => a.day === day && a.kind === 'other' && a.note?.startsWith(WAKE_PREFIX))
  return {
    ...data,
    activities: [
      ...data.activities,
      { id: `despertador:${day}`, day, kind: 'other', note: `${DESP_PREFIX} ${n} lagartijas a las ${clock}` },
      ...(woke ? [] : [{ id: `wake:${day}`, day, kind: 'other' as const, note: `${WAKE_PREFIX} ${clock}` }]),
    ],
  }
}

const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/**
 * ¿Toca insistir ahora? Devuelve la ranura de 5 min (para que cada aviso tenga su llave) o null.
 * Solo dentro de la hora siguiente a tu hora de despertar y si aún no las hiciste.
 */
export function ranuraInsistir(data: AppData, day: string, clock: string): number | null {
  const d = despertadorDe(data)
  if (!d.on || despertoHoy(data, day)) return null
  const desde = mins(clock) - mins(data.settings.reminders.wake)
  if (desde < 0 || desde >= DESP_VENTANA) return null
  return Math.floor(desde / DESP_CADA)
}

/** Cuántas lagartijas hiciste al despertar esta semana (para Historial y Hoy). */
export function semanaDespertar(data: Pick<AppData, 'activities'>, days: string[]): number {
  return days.filter(day => despertoHoy(data, day)).length
}
