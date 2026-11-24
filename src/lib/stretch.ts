/**
 * Estiramiento diario: al despertar (movilidad suave, unos 5 min) y antes de dormir (posturas
 * sostenidas que calman, unos 8 min). Lo que cuenta para la flexibilidad es la constancia, no la
 * intensidad: 30 a 45 segundos por músculo, todos los días, hasta sentir tensión y nunca dolor.
 *
 * Se guarda como actividad 'other' con la nota "Estiramiento: noche" (igual que el rescate), así
 * que no cambia la forma de ningún registro y los teléfonos viejos y el servidor lo conservan.
 */
import { dateKey, makeId, type Activity, type AppData } from './model'
import { shiftDay } from './progress'

export type StretchWhen = 'manana' | 'noche'
export type StretchMove = { name: string; how: string; seconds: number; sides?: boolean }
export type StretchStep = { name: string; how: string; seconds: number; side?: 'Lado izquierdo' | 'Lado derecho' }

export const ROUTINES: Record<StretchWhen, { title: string; why: string; moves: StretchMove[] }> = {
  manana: {
    title: 'Al despertar',
    why: 'Movilidad suave para despertar la espalda y la cadera. Muévete despacio, sin rebotar.',
    moves: [
      { name: 'Gato y vaca', how: 'En cuatro puntos. Arquea la espalda hacia arriba y luego hunde el pecho, al ritmo de tu respiración.', seconds: 40 },
      { name: 'Círculos de cadera', how: 'De pie, manos en la cintura. Círculos grandes y lentos, cambia de sentido a la mitad.', seconds: 30 },
      { name: 'Zancada con giro', how: 'Pie adelante, rodilla de atrás al piso. Gira el pecho hacia la pierna de adelante y abre el brazo.', seconds: 30, sides: true },
      { name: 'Perro boca abajo pedaleando', how: 'Manos y pies al piso, cadera arriba. Dobla una rodilla y luego la otra para estirar las pantorrillas.', seconds: 40 },
      { name: 'Sentadilla profunda', how: 'Baja todo lo que puedas con los talones en el piso. Codos empujando las rodillas hacia afuera.', seconds: 40 },
      { name: 'Apertura de pecho', how: 'De pie, brazos al frente. Ábrelos hacia atrás juntando los omóplatos y regresa.', seconds: 30 },
      { name: 'Bisagra al piso', how: 'Rodillas un poco dobladas. Baja el pecho hacia el piso con la espalda larga y sube despacio.', seconds: 30 },
    ],
  },
  noche: {
    title: 'Antes de dormir',
    why: 'Posturas sostenidas y respiración lenta. Estira hasta sentir tensión, nunca dolor, y suelta el aire largo.',
    moves: [
      { name: 'Flexor de cadera', how: 'Rodilla de atrás al piso. Aprieta el glúteo y lleva la cadera un poco adelante. La espalda no se arquea.', seconds: 40, sides: true },
      { name: 'Isquiotibiales acostado', how: 'Boca arriba, sube una pierna recta y sujétala con una toalla o con las manos detrás del muslo.', seconds: 40, sides: true },
      { name: 'Glúteo en figura 4', how: 'Boca arriba, tobillo sobre la rodilla contraria. Jala esa pierna hacia tu pecho.', seconds: 40, sides: true },
      { name: 'Cuádriceps de lado', how: 'Acostado de lado, toma tu tobillo y lleva el talón al glúteo. Rodillas juntas.', seconds: 40, sides: true },
      { name: 'Mariposa', how: 'Sentado, plantas de los pies juntas. Deja caer las rodillas y lleva el pecho un poco adelante.', seconds: 40 },
      { name: 'Torsión acostado', how: 'Boca arriba, lleva una rodilla al lado contrario y mira hacia el otro lado. Hombros pegados al piso.', seconds: 30, sides: true },
      { name: 'Postura del niño', how: 'Rodillas al piso, glúteos a los talones y brazos estirados al frente. Respira lento.', seconds: 60 },
    ],
  },
}

/** Cada postura por lado se vuelve un paso: el reloj avanza solo y te avisa cuándo cambiar. */
export function stepsOf(when: StretchWhen, short = false): StretchStep[] {
  const steps = ROUTINES[when].moves.flatMap<StretchStep>(m => m.sides
    ? [{ name: m.name, how: m.how, seconds: m.seconds, side: 'Lado izquierdo' }, { name: m.name, how: m.how, seconds: m.seconds, side: 'Lado derecho' }]
    : [{ name: m.name, how: m.how, seconds: m.seconds }])
  if (!short) return steps
  // Versión de dos minutos (Hábitos atómicos): los primeros pasos hasta llenar 120 segundos.
  const out: StretchStep[] = []
  let total = 0
  for (const s of steps) { if (total >= 120) break; out.push(s); total += s.seconds }
  return out
}
export function totalSeconds(steps: StretchStep[]): number { return steps.reduce((s, x) => s + x.seconds, 0) }

export const STRETCH_PREFIX = 'Estiramiento'
const WHEN_NOTE: Record<StretchWhen, string> = { manana: 'mañana', noche: 'noche' }
export function isStretch(a: Activity): boolean { return a.kind === 'other' && (a.note ?? '').startsWith(STRETCH_PREFIX) }
export function stretchWhen(a: Activity): StretchWhen | null {
  if (!isStretch(a)) return null
  return (a.note ?? '').includes('noche') ? 'noche' : 'manana'
}
export function stretchRow(when: StretchWhen, seconds: number, day = dateKey()): Activity {
  return { id: makeId(), day, kind: 'other', minutes: Math.max(1, Math.round(seconds / 60)), note: `${STRETCH_PREFIX}: ${WHEN_NOTE[when]}` }
}

/** Qué toca según la hora: mañana de 4 a 12, noche desde las 20. A media tarde no se sugiere nada. */
export function stretchSlot(hour = new Date().getHours()): StretchWhen | null {
  if (hour >= 4 && hour < 12) return 'manana'
  if (hour >= 20 || hour < 4) return 'noche'
  return null
}

export function stretchedOn(data: AppData, day = dateKey()): Set<StretchWhen> {
  return new Set(data.activities.filter(a => a.day === day).map(stretchWhen).filter((w): w is StretchWhen => !!w))
}

/** Días seguidos estirando (cualquiera de las dos rutinas). Si hoy todavía no, cuenta hasta ayer. */
export function stretchStreak(data: AppData, today = dateKey()): number {
  const days = new Set(data.activities.filter(isStretch).map(a => a.day))
  let day = days.has(today) ? today : shiftDay(today, -1)
  let n = 0
  while (days.has(day)) { n++; day = shiftDay(day, -1) }
  return n
}

/** Abre el reproductor desde cualquier parte (Hoy, Entrenar, Noche, el +, un enlace). Lo escucha App. */
export const STRETCH_EVENT = 'bambu:estirar'
export function openStretch(when: StretchWhen) { window.dispatchEvent(new CustomEvent(STRETCH_EVENT, { detail: when })) }
