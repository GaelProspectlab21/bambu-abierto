/**
 * Los tres anillos del día (idea de Apple Fitness): Cuerpo, Mente y Alma, cada uno de 0 a 1.
 * Responden "¿cómo voy hoy?" de un vistazo, sin abrir nada.
 *
 * Cada anillo es el promedio de sus partes que APLICAN hoy. Si una parte no aplica
 * (no tienes módulo de lectura, hoy no toca rutina), no cuenta ni a favor ni en contra.
 * Descansar también cierra Cuerpo cuando hoy no toca entrenar (idea de Gentler Streak).
 */
import { activeHabits, modulesOf, type AppData } from './model'
import { habitOn } from './jardin'
import { routineFor, routineProgress } from './rutina'
import { readOn } from './lectura'
import { walkProgress } from './cardio'

export type Anillos = { cuerpo: number; mente: number | null; alma: number | null }

const avg = (parts: number[]): number | null => parts.length ? Math.min(1, Math.max(0, parts.reduce((a, b) => a + b, 0) / parts.length)) : null

export function anillosDe(data: AppData, day: string): Anillos {
  const mods = modulesOf(data.settings)
  const cuerpo: number[] = []
  const rt = mods.training ? routineFor(data, day) : null
  if (rt) { const p = routineProgress(data, day, rt); cuerpo.push(p.total ? p.done / p.total : 0) }
  if (data.settings.walkDaily) cuerpo.push(walkProgress(data, day))

  const mente: number[] = []
  if (mods.reading) mente.push(readOn(data, day) ? 1 : 0)
  const tareas = data.tasks.filter(t => t.status !== 'archived' && (t.dueDate === day || t.completedOn === day))
  if (tareas.length) mente.push(tareas.filter(t => t.status === 'done' && t.completedOn === day).length / tareas.length)

  const alma: number[] = []
  const habits = activeHabits(data.settings)
  if (habits.length) alma.push(habits.filter(h => habitOn(data, h, day)).length / habits.length)
  // La noche (¿diste lo que traías?) cuenta solo para quien ya la usa: a nadie se le pide algo que no eligió.
  if (data.checkins.some(c => typeof c.given === 'number')) alma.push(data.checkins.some(c => c.day === day && typeof c.given === 'number') ? 1 : 0)

  return { cuerpo: avg(cuerpo) ?? 1, mente: avg(mente), alma: avg(alma) }
}

/** Cuerpo tiene algo que medir hoy (rutina o caminata). Si no, se cierra solo por descanso. */
export function cuerpoAplica(data: AppData, day: string): boolean {
  return !!(modulesOf(data.settings).training && routineFor(data, day)) || !!data.settings.walkDaily
}

/** Cuántos anillos cerraste hoy (para el texto corto de la tarjeta). */
export function cerrados(a: Anillos): number {
  return [a.cuerpo, a.mente, a.alma].filter(v => v !== null && v >= 1).length
}

export type Detalle = { cuerpo: string; mente: string | null; alma: string | null }
/**
 * v11.3: qué hay dentro de cada anillo, en palabras. Gael no entendía la diferencia entre Mente y Alma
 * con un "22%". Ahora cada anillo dice lo que cuenta y lo que falta: series, tareas, hábitos.
 */
export function detalleAnillos(data: AppData, day: string): Detalle {
  const mods = modulesOf(data.settings)
  const cuerpo: string[] = []
  const rt = mods.training ? routineFor(data, day) : null
  if (rt) { const p = routineProgress(data, day, rt); cuerpo.push(p.total && p.done >= p.total ? 'rutina lista' : `${p.done} de ${p.total} series`) }
  if (data.settings.walkDaily) cuerpo.push(walkProgress(data, day) >= 1 ? 'caminaste' : 'falta caminar')

  const mente: string[] = []
  if (mods.reading) mente.push(readOn(data, day) ? 'leíste' : 'sin leer')
  const tareas = data.tasks.filter(t => t.status !== 'archived' && (t.dueDate === day || t.completedOn === day))
  if (tareas.length) mente.push(`${tareas.filter(t => t.status === 'done' && t.completedOn === day).length} de ${tareas.length} tareas`)

  const alma: string[] = []
  const habits = activeHabits(data.settings)
  if (habits.length) alma.push(`${habits.filter(h => habitOn(data, h, day)).length} de ${habits.length} hábitos`)
  if (data.checkins.some(c => typeof c.given === 'number')) alma.push(data.checkins.some(c => c.day === day && typeof c.given === 'number') ? 'noche lista' : 'falta la noche')

  return { cuerpo: cuerpo.length ? cuerpo.join(' · ') : 'descanso', mente: mente.length ? mente.join(' · ') : null, alma: alma.length ? alma.join(' · ') : null }
}
