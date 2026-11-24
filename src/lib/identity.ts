/**
 * Votos por la persona que quieres ser (Hábitos atómicos, cap. 2): cada cosa que registras es un
 * voto por tu norte. No inventa nada: todo sale de tus registros y se recalcula desde cero.
 *
 * También vive aquí el "rescate" (Pierre Dalati: atrapa el momento antes de scrollear) y la regla
 * de "nunca falles dos veces" (Hábitos atómicos, cap. 16).
 */
import { activeHabits, dateKey, makeId, type Activity, type AppData } from './model'
import { realReading, shiftDay } from './progress'
import { counts } from './focusStats'
import { keptToday } from './vara'
import { isStretch } from './stretch'

export type VoteKind = 'lectura' | 'enfoque' | 'entreno' | 'habito' | 'tarea' | 'medida' | 'promesa' | 'rescate' | 'estira'
export type Votes = { total: number; by: Record<VoteKind, number> }

/** Prefijo del registro de un rescate. Se guarda como actividad 'other' para que los teléfonos y el servidor viejos lo conserven. */
export const RESCUE_PREFIX = 'Rescate'
export function isRescue(a: Activity): boolean { return a.kind === 'other' && (a.note ?? '').startsWith(RESCUE_PREFIX) }
export function rescueRow(choice: string, day = dateKey(), minutes = 2): Activity {
  return { id: makeId(), day, kind: 'other', minutes, note: `${RESCUE_PREFIX}: ${choice}`.slice(0, 120) }
}

/** Lo que puedes hacer en lugar de scrollear: dos minutos, sin pensar (regla de los dos minutos). */
export const RESCUES = ['Leer una página', '10 lagartijas', 'Tomar agua', 'Ordenar algo de tu cuarto', 'Mandarle mensaje a alguien que quieres', 'Salir a caminar 2 minutos'] as const

export function votesOn(data: AppData, day = dateKey()): Votes {
  const by: Record<VoteKind, number> = { lectura: 0, enfoque: 0, entreno: 0, habito: 0, tarea: 0, medida: 0, promesa: 0, rescate: 0, estira: 0 }
  by.lectura = data.reading.filter(r => r.day === day && realReading(r)).length
  by.enfoque = data.focus.filter(f => f.day === day && counts(f)).length
  // El entreno es un voto por día, no por serie: si no, 20 series pesarían más que todo lo demás.
  const moved = data.sets.some(s => s.day === day) || data.activities.some(a => a.day === day && ['football', 'walk', 'rest'].includes(a.kind))
  by.entreno = moved ? 1 : 0
  const valid = new Set(activeHabits(data.settings).map(h => h.id))
  by.habito = (data.habits[day] ?? []).filter(id => valid.has(id)).length
  by.tarea = data.tasks.filter(t => t.status === 'done' && t.completedOn === day).length
  const row = data.checkins.find(c => c.day === day)
  by.medida = row?.capacity !== undefined ? 1 : 0
  by.promesa = keptToday(data, day).length
  by.rescate = data.activities.filter(a => a.day === day && isRescue(a)).length
  // Mañana y noche cuentan aparte: son dos rutinas distintas, máximo dos al día.
  by.estira = Math.min(2, data.activities.filter(a => a.day === day && isStretch(a)).length)
  return { total: Object.values(by).reduce((s, n) => s + n, 0), by }
}

/** Votos de los últimos 7 días (hoy al final), para la tira de la semana. */
export function votesWeek(data: AppData, today = dateKey()): { day: string; total: number }[] {
  return Array.from({ length: 7 }, (_, i) => { const day = shiftDay(today, i - 6); return { day, total: votesOn(data, day).total } })
}

/** En qué se fue tu tiempo medido hoy: lo que la app sí sabe, sin adivinar lo demás. */
export type DayTime = { lectura: number; enfoque: number; entreno: number; series: number; rescates: number; total: number }
export function dayTime(data: AppData, day = dateKey()): DayTime {
  const lectura = Math.round(data.reading.filter(r => r.day === day && realReading(r)).reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60)
  const enfoque = data.focus.filter(f => f.day === day && counts(f)).reduce((s, f) => s + f.minutes, 0)
  const series = data.sets.filter(s => s.day === day).length
  // Una serie con su descanso ronda los 2 minutos; el fútbol y la caminata traen sus minutos.
  const entreno = series * 2 + data.activities.filter(a => a.day === day && (a.kind === 'football' || a.kind === 'walk' || isStretch(a))).reduce((s, a) => s + (a.minutes ?? 0), 0)
  const rescates = data.activities.filter(a => a.day === day && isRescue(a)).length
  return { lectura, enfoque, entreno, series, rescates, total: lectura + enfoque + entreno }
}

/**
 * Nunca falles dos veces: si ayer no hubo lectura y antier sí, hoy es el día que cuida la racha.
 * Devuelve 'save' (hoy rescatas el hábito), 'fresh' (ya van dos o más sin leer: arranca de cero sin culpa) o null.
 */
export function neverTwice(readDays: Set<string>, today = dateKey()): 'save' | 'fresh' | null {
  if (readDays.has(today)) return null
  const y = shiftDay(today, -1), yy = shiftDay(today, -2)
  if (readDays.has(y)) return null
  if (readDays.has(yy)) return 'save'
  return readDays.size ? 'fresh' : null
}

/** Texto del voto para la celebración: "Un voto más por alguien constante." */
export function voteLine(_north: string | undefined, total: number): string {
  return total === 1 ? 'Tu primer hecho de hoy. Sigue.' : `${total} hechos hoy. Cada uno cuenta.`
}
