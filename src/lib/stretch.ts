/**
 * Estiramiento diario: al despertar (movilidad suave, unos 5 min) y antes de dormir (posturas
 * sostenidas). Dosis conservadora adaptada de ACSM: 20 s, dos vueltas, sin dolor.
 * La movilidad previa no sustituye el calentamiento completo del equipo.
 *
 * Se guarda como actividad 'other' con la nota "Estiramiento: noche" (igual que el rescate), así
 * que no cambia la forma de ningún registro y los teléfonos viejos y el servidor lo conservan.
 */
import { dateKey, makeId, type Activity, type AppData } from './model'
import { shiftDay } from './progress'
import type { Muscle } from './exercises'

export type StretchWhen = 'manana' | 'noche'
export type StretchMove = { name: string; how: string; seconds: number; sides?: boolean; photo: string; frame?: 0 | 1; muscle: string; why: string; kind: 'dynamic' | 'static'; evidence: string }
export type StretchStep = StretchMove & { side?: 'Lado izquierdo' | 'Lado derecho'; round: number }

export const ROUTINES: Record<StretchWhen, { title: string; why: string; rounds: number; moves: StretchMove[] }> = {
  manana: {
    title: 'Al despertar',
    why: 'Movilidad suave. Antes de entrenar o jugar, sigue también el calentamiento de tu entrenador. Sin rebotes ni dolor.',
    rounds: 1,
    moves: [
      { name: 'Gato suave', how: 'En cuatro puntos, redondea un poco la espalda y vuelve al centro. No hundas la cintura ni fuerces el cuello.', seconds: 30, photo: 'gato', muscle: 'Espalda', why: 'Recorre un rango cómodo al despertar.', kind: 'dynamic', evidence: 'stretch-dynamic' },
      { name: 'Círculos de cadera con apoyo', how: 'Sujétate de una pared firme. Levanta una rodilla y dibuja círculos pequeños, sin girar la cintura.', seconds: 30, sides: true, photo: 'cadera', muscle: 'Glúteos y cadera', why: 'Practica el movimiento de la cadera con control.', kind: 'dynamic', evidence: 'stretch-dynamic' },
      { name: 'Círculos de tobillo', how: 'Con apoyo firme, levanta un poco el pie y dibuja círculos lentos. Cambia de sentido a la mitad.', seconds: 30, sides: true, photo: 'tobillo', muscle: 'Pantorrillas', why: 'Mueve el tobillo antes de caminar o correr.', kind: 'dynamic', evidence: 'stretch-dynamic' },
      { name: 'Círculos de brazos', how: 'Abre los brazos y haz círculos pequeños. Cambia de sentido a la mitad, sin subir los hombros.', seconds: 30, photo: 'brazos', muscle: 'Hombros', why: 'Prepara el movimiento de los brazos.', kind: 'dynamic', evidence: 'stretch-dynamic' },
      { name: 'Apertura de pecho', how: 'Abre y cierra los brazos despacio, como un abrazo. Quédate en un rango fácil, sin lanzarlos hacia atrás.', seconds: 30, photo: 'pecho', muscle: 'Pecho', why: 'Mueve los hombros sin sostener tensión.', kind: 'dynamic', evidence: 'stretch-dynamic' },
      { name: 'Balanceo corto de pierna', how: 'Con apoyo firme, mueve la pierna adelante y atrás lentamente. No busques altura ni arquees la cintura.', seconds: 30, sides: true, photo: 'pierna', muscle: 'Isquiotibiales y flexores de cadera', why: 'Prepara la cadera para moverse.', kind: 'dynamic', evidence: 'stretch-dynamic' },
    ],
  },
  noche: {
    title: 'Antes de dormir',
    why: 'Después de entrenar o por la noche. Camina suave unos minutos antes. Dos vueltas con tensión cómoda, sin dolor ni rebotes.',
    rounds: 2,
    moves: [
      { name: 'Flexor de cadera', how: 'Apoya la rodilla en algo suave. Aprieta el glúteo y mueve apenas la cadera adelante, sin arquear la espalda.', seconds: 20, sides: true, photo: 'flexor', frame: 1, muscle: 'Flexores de cadera', why: 'Trabaja su flexibilidad después del fútbol.', kind: 'static', evidence: 'stretch-dose' },
      { name: 'Isquiotibiales acostado', how: 'Boca arriba, sujeta detrás del muslo y extiende la rodilla hasta tensión cómoda. No la bloquees ni jales el pie.', seconds: 20, sides: true, photo: 'isquios', frame: 1, muscle: 'Isquiotibiales', why: 'Practica flexibilidad sin doblar la espalda baja.', kind: 'static', evidence: 'stretch-dose' },
      { name: 'Glúteo en figura 4', how: 'Boca arriba, tobillo sobre el muslo contrario. Acerca suavemente las piernas sujetando detrás del muslo. No empujes la rodilla.', seconds: 20, sides: true, photo: 'gluteo', frame: 1, muscle: 'Glúteos', why: 'Trabaja la flexibilidad de la parte posterior de la cadera.', kind: 'static', evidence: 'stretch-dose' },
      { name: 'Cuádriceps de lado', how: 'Acostado de lado, toma el pie de arriba sin jalar fuerte. Mantén la cintura quieta. Si molesta la rodilla, salta esta postura.', seconds: 20, sides: true, photo: 'cuadriceps', frame: 1, muscle: 'Cuádriceps', why: 'Trabaja la flexibilidad del frente del muslo.', kind: 'static', evidence: 'stretch-dose' },
      { name: 'Mariposa cómoda', how: 'Sentado, junta las plantas de los pies como en la primera foto. Espalda cómoda. Deja las rodillas libres, sin empujarlas con manos ni codos.', seconds: 20, photo: 'aductores', frame: 0, muscle: 'Aductores', why: 'Trabaja la flexibilidad de la cara interna del muslo.', kind: 'static', evidence: 'stretch-dose' },
      { name: 'Postura del niño', how: 'Lleva la cadera hacia los talones solo hasta donde sea cómodo y respira. No fuerces la espalda. Si molesta la rodilla, salta esta postura.', seconds: 20, photo: 'nino', frame: 0, muscle: 'Espalda', why: 'Permite una postura suave al terminar el día.', kind: 'static', evidence: 'stretch-dose' },
    ],
  },
}

/** Cada postura por lado se vuelve un paso: el reloj avanza solo y te avisa cuándo cambiar. */
export function stepsOf(when: StretchWhen, short = false): StretchStep[] {
  const routine = ROUTINES[when]
  const steps = Array.from({ length: routine.rounds }, (_, r) => routine.moves.flatMap<StretchStep>(m => m.sides
    ? [{ ...m, round: r + 1, side: 'Lado izquierdo' }, { ...m, round: r + 1, side: 'Lado derecho' }]
    : [{ ...m, round: r + 1 }])).flat()
  if (!short) return steps
  // Versión de dos minutos (Hábitos atómicos): los primeros pasos hasta llenar 120 segundos.
  const out: StretchStep[] = []
  let total = 0
  for (const s of steps) { if (total >= 120) break; out.push(s); total += s.seconds }
  return out
}
export function totalSeconds(steps: StretchStep[]): number { return steps.reduce((s, x) => s + x.seconds, 0) }

/** A gentle dynamic option, never a static hold between working sets. */
export function restMobility(loaded: Muscle[], upcoming: Muscle[]): StretchMove {
  const legs: Muscle[] = ['cuadriceps', 'gluteos', 'isquios', 'pantorrillas', 'aductores']
  const legsWorking = [...loaded, ...upcoming].some(m => legs.includes(m))
  return legsWorking
    ? { name: 'Círculos suaves de hombros', how: 'Deja los brazos sueltos y rueda los hombros despacio. Sin cargar peso ni buscar tensión. Puedes quedarte quieto si lo prefieres.', seconds: 20, photo: 'hombros', muscle: 'Hombros', why: 'Movilidad suave mientras recuperas el aire.', kind: 'dynamic', evidence: 'stretch-dynamic' }
    : { ...ROUTINES.manana.moves.find(m => m.photo === 'tobillo')!, seconds: 20, how: 'Con apoyo, círculos pequeños de tobillo. Diez segundos por pie, sin buscar tensión. Descansar quieto también está bien.' }
}

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
