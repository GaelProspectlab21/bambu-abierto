/**
 * El 40% y el oro (producto/GAMIFICACION.md, paso 1).
 *
 * Goggins: cuando tu cabeza dice "ya acabé", te queda 40%. Al cerrar un círculo, bambú ofrece UN
 * extra chico para ese círculo; si lo haces, el círculo se vuelve de oro. El reto siempre es un
 * paso más de lo que hiciste hoy, así sirve igual al que empieza que al que entrena mucho.
 *
 * Se guarda como actividad 'other' con nota "Extra: cuerpo: ..." (igual que el rescate y la pausa):
 * no cambia la forma de los registros, así que los teléfonos y el servidor viejos lo conservan.
 */
import { makeId, type Activity, type AppData } from './model'
import { anillosDe, cuerpoAplica, type Anillos } from './anillos'

export type Ring = 'cuerpo' | 'mente' | 'alma'
export const RINGS: Ring[] = ['cuerpo', 'mente', 'alma']
export const RING_NAME: Record<Ring, string> = { cuerpo: 'Cuerpo', mente: 'Mente', alma: 'Alma' }
export const EXTRA_PREFIX = 'Extra'

/** Un extra chico y concreto por círculo. Uno se hace en minutos, nunca en otra sesión entera. */
export const EXTRAS: Record<Ring, string[]> = {
  cuerpo: ['Una serie más', '10 minutos más caminando', '20 sentadillas'],
  mente: ['10 minutos más de lectura', 'Una tarea más', '10 minutos más de enfoque'],
  alma: ['Un capítulo más de la Biblia', 'Un hábito más', 'Rezar por alguien'],
}

export function isExtra(a: Activity): boolean { return a.kind === 'other' && (a.note ?? '').startsWith(`${EXTRA_PREFIX}: `) }
export function extraRing(a: Activity): Ring | null {
  if (!isExtra(a)) return null
  const r = (a.note ?? '').slice(EXTRA_PREFIX.length + 2).split(':')[0] as Ring
  return RINGS.includes(r) ? r : null
}
export function extraRow(ring: Ring, text: string, day: string): Activity {
  return { id: `extra:${makeId()}`, day, kind: 'other', note: `${EXTRA_PREFIX}: ${ring}: ${text.trim().slice(0, 80)}` }
}

const closed = (a: Anillos, r: Ring) => { const v = a[r]; return v !== null && v >= 1 }

/** Qué círculos son de oro hoy: cerrados y con su extra hecho ese mismo día. */
export function oroDe(data: AppData, day: string, a = anillosDe(data, day)): Record<Ring, boolean> {
  const done = new Set(data.activities.filter(x => x.day === day).map(extraRing).filter((r): r is Ring => !!r))
  return { cuerpo: closed(a, 'cuerpo') && done.has('cuerpo'), mente: closed(a, 'mente') && done.has('mente'), alma: closed(a, 'alma') && done.has('alma') }
}

/** El primer círculo cerrado que todavía no es de oro: a ese se le ofrece el 40%. */
export function ofrecerOro(data: AppData, day: string, a = anillosDe(data, day)): Ring | null {
  const oro = oroDe(data, day, a)
  // En descanso Cuerpo se cierra solo: no se pide un extra el día que toca recuperarse.
  return RINGS.find(r => closed(a, r) && !oro[r] && (r !== 'cuerpo' || cuerpoAplica(data, day))) ?? null
}

/** Puntos del día: círculo cerrado 1, de oro 2. Máximo 6. */
export function puntosDia(data: AppData, day: string): number {
  const a = anillosDe(data, day), oro = oroDe(data, day, a)
  return RINGS.reduce((n, r) => n + (closed(a, r) ? (oro[r] ? 2 : 1) : 0), 0)
}

/** Guarda el extra. Si ya hiciste el de ese círculo hoy, no duplica. */
export function hacerExtra(data: AppData, ring: Ring, text: string, day: string): AppData {
  if (data.activities.some(x => x.day === day && extraRing(x) === ring)) return data
  return { ...data, activities: [...data.activities, extraRow(ring, text, day)] }
}
