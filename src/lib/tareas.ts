/**
 * Tareas (v11.2): lo que importa HOY primero, el sapo del día y la semana como tablero.
 *
 * El sapo: la tarea que más flojera o miedo te da. Si te la comes primero, lo demás del día se
 * siente fácil (Brian Tracy, "Eat That Frog", sobre la frase atribuida a Mark Twain). Uno por día.
 */
import type { AppData } from './model'
import type { PersonalTask } from './personal'
import { shiftDay } from './jardin'

const open = (t: PersonalTask) => t.status === 'pending' || t.status === 'in_progress'

/** La tarea marcada como sapo de ese día (si sigue viva). */
export function sapoDe(data: AppData, day: string): PersonalTask | undefined {
  return data.tasks.find(t => t.sapo === day && t.status !== 'archived')
}

/** Marca (o quita, si ya lo era) el sapo del día. Solo uno: el anterior deja de serlo. Lo trae a hoy. */
export function marcarSapo(data: AppData, id: string, day: string, now = Date.now()): AppData {
  const ya = data.tasks.find(t => t.id === id)?.sapo === day
  return {
    ...data,
    tasks: data.tasks.map(t => {
      if (t.id === id) {
        if (ya) { const { sapo: _quitado, ...rest } = t; return { ...rest, updatedAt: now } }
        return { ...t, sapo: day, dueDate: !t.dueDate || t.dueDate > day ? day : t.dueDate, updatedAt: now }
      }
      if (t.sapo === day) { const { sapo: _otro, ...rest } = t; return { ...rest, updatedAt: now } }
      return t
    }),
  }
}

/** Orden para decidir: sapo, atrasadas, hoy, mañana. Lo demás (sin fecha o más adelante) aparte. */
export function paraBloque(data: AppData, today: string): { cerca: PersonalTask[]; despues: PersonalTask[] } {
  const manana = shiftDay(today, 1)
  const vivas = data.tasks.filter(open)
  const rango = (t: PersonalTask) => t.sapo === today ? 0 : !t.dueDate ? 9 : t.dueDate < today ? 1 : t.dueDate === today ? 2 : t.dueDate === manana ? 3 : 9
  const orden = (a: PersonalTask, b: PersonalTask) => rango(a) - rango(b) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt - a.updatedAt
  const cerca = vivas.filter(t => rango(t) < 9).sort(orden)
  const despues = vivas.filter(t => rango(t) === 9).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt - a.updatedAt)
  return { cerca, despues }
}

/** Lunes de la semana de `day`. */
export function lunesDe(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  return shiftDay(day, -((d.getDay() + 6) % 7))
}

export type DiaSemana = { day: string; tareas: PersonalTask[] }
/** El tablero de la semana: 7 días (lunes a domingo) con sus tareas, más las que no tienen fecha. */
export function semanaDe(data: AppData, lunes: string): { dias: DiaSemana[]; sinFecha: PersonalTask[] } {
  const vivas = data.tasks.filter(t => t.status !== 'archived')
  const dias = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(lunes, i)
    // Hechas: el día que las hiciste. Pendientes: su fecha.
    const tareas = vivas.filter(t => t.status === 'done' ? t.completedOn === day : t.dueDate === day)
      .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || Number(b.sapo === day) - Number(a.sapo === day) || b.updatedAt - a.updatedAt)
    return { day, tareas }
  })
  return { dias, sinFecha: vivas.filter(t => open(t) && !t.dueDate).sort((a, b) => b.updatedAt - a.updatedAt) }
}

/** Mueve una tarea a otro día (o a "sin fecha"). Si era sapo de otro día, deja de serlo. */
export function moverTarea(data: AppData, id: string, day: string | undefined, now = Date.now()): AppData {
  const actual = data.tasks.find(t => t.id === id)
  if (!actual || actual.dueDate === day) return data
  return {
    ...data,
    tasks: data.tasks.map(t => {
      if (t.id !== id || t.dueDate === day) return t
      const { sapo, dueDate: _vieja, ...rest } = t
      return { ...rest, ...(day ? { dueDate: day } : {}), ...(sapo && sapo === day ? { sapo } : {}), updatedAt: now }
    }),
  }
}
