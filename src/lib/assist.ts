/**
 * Ayuda para armar un bloque de enfoque desde una o varias tareas. Jev (decisiones cerradas)
 * propone nivel y tamaño de cada tarea; tú revisas y empiezas. Si Jev no responde (sin cuenta,
 * sin señal), una regla local propone lo mismo para que la fricción nunca suba.
 *
 * Jev NO escribe texto: solo clasifica. Lo escrito (nombre del bloque, mini entregables) sale
 * de tus propias tareas.
 */
import type { PersonalTask } from './personal'

export type Source = 'jev' | 'local'
export type Guess = { id: string; level: 1 | 2 | 3 | 4; size: number; source: Source }
export type BlockDraft = {
  task: string; taskIds: string[]; minutes: number; level: number; goal?: string
  micro: { text: string; minutes: number }[]; source: Source
}

/** Minutos estimados de una sola tarea según el tamaño (0 a 4) que da Jev: acción rápida, 25, 45, 90, 2 h o más. */
export const SIZE_MINUTES = [10, 25, 45, 90, 120]
export const BLOCK_OPTIONS = [25, 45, 60, 90, 120]

export function sizeToMinutes(size: number): number {
  return SIZE_MINUTES[Math.max(0, Math.min(4, Math.round(size)))]
}
/** El bloque se redondea hacia arriba a una duración que ofrece el formulario. */
export function snapBlock(total: number): number {
  return BLOCK_OPTIONS.find(o => o >= total) ?? 120
}

const L4 = /cliente|venta|vender|prospect|cobrar|cotiz|propuesta|reuni[oó]n|cerrar|llamar a|lead|oferta/i
const L3 = /sistema|proceso|automat|contenido|video|v[ií]deo|campa[ñn]a|secuencia|plantilla|dise[ñn]|escribir|estudiar|aprender|armar|construir|mejorar/i
const L2 = /entreg|enviar|revisar|corregir|terminar|publicar|subir|responder|contestar/i
const L1 = /factura|pagar|admin|limpiar|ordenar|recado|comprar|tr[aá]mite|agenda|archivar/i
const LONG = /escribir|dise[ñn]|editar|armar|estudiar|construir|investigar|planear|grabar/i
const QUICK = /llamar|enviar|responder|contestar|pagar|agendar|confirmar|revisar/i

/** Regla local de respaldo. Es más burda que Jev; por eso se marca como "local". */
export function localGuess(task: Pick<PersonalTask, 'id' | 'text' | 'subtasks'>): Guess {
  const t = task.text
  const level = L1.test(t) && !L4.test(t) ? 1 : L4.test(t) ? 4 : L3.test(t) ? 3 : L2.test(t) ? 2 : 3
  const extra = (task.subtasks?.length ?? 0) >= 4 ? 1 : 0
  const size = Math.min(4, (LONG.test(t) ? 2 : QUICK.test(t) ? 0.5 : 1.5) + extra)
  return { id: task.id, level: level as Guess['level'], size, source: 'local' }
}

/** Junta varias tareas en UN bloque: nombre, suma de minutos (redondeada), nivel más alto y cada tarea como mini entregable. */
export function buildBlock(tasks: PersonalTask[], guesses: Guess[]): BlockDraft {
  const by = new Map(guesses.map(g => [g.id, g]))
  const each = tasks.map(t => {
    const g = by.get(t.id) ?? localGuess(t)
    // Lo que ya fijaste tú manda: un nivel puesto, o minutos distintos del 25 por defecto.
    const minutes = t.minutes && t.minutes !== 25 ? t.minutes : sizeToMinutes(g.size)
    return { t, level: t.level ?? g.level, minutes, source: g.source }
  })
  const total = each.reduce((s, e) => s + e.minutes, 0)
  const single = each.length === 1 ? each[0].t : null
  const open = single?.subtasks?.find(s => !s.done)
  return {
    task: (each.map(e => e.t.text).join(' + ')).slice(0, 300), taskIds: each.map(e => e.t.id),
    minutes: snapBlock(total), level: Math.max(...each.map(e => e.level)),
    goal: open ? open.text.slice(0, 300) : undefined,
    micro: each.length > 1 ? each.slice(0, 5).map(e => ({ text: e.t.text.slice(0, 120), minutes: e.minutes })) : (single?.subtasks ?? []).filter(s => !s.done).slice(0, 5).map(s => ({ text: s.text.slice(0, 120), minutes: 0 })),
    source: each.some(e => e.source === 'jev') ? 'jev' : 'local',
  }
}

type Invoke = (name: string, opts: { body: Record<string, unknown> }) => Promise<{ data: unknown; error: unknown }>

/** Pide a Jev (por la función bambu-jev). Devuelve null si no hay nube, no responde o tarda: entonces se usa la regla local. */
export async function askJev(tasks: PersonalTask[], invoke: Invoke | null, timeoutMs = 7000): Promise<Guess[] | null> {
  if (!invoke || !tasks.length) return null
  try {
    const res = await Promise.race([
      invoke('bambu-jev', { body: { tasks: tasks.slice(0, 8).map(t => ({ id: t.id, text: t.text.slice(0, 300), notes: (t.notes ?? '').slice(0, 300) })) } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Jev tardó demasiado')), timeoutMs)),
    ])
    const items = (res.data as { items?: { id: string; level: number; size: number }[] } | null)?.items
    if (!Array.isArray(items) || !items.length) return null
    return items.flatMap(i => Number.isFinite(i.level) && Number.isFinite(i.size) && i.level >= 1 && i.level <= 4
      ? [{ id: String(i.id), level: Math.round(i.level) as Guess['level'], size: Math.max(0, Math.min(4, i.size)), source: 'jev' as Source }] : [])
  } catch { return null }
}

/** Las tareas más importantes para sugerir un bloque sin pensar: mayor nivel y fecha más cercana. */
export function suggestPick(tasks: PersonalTask[], max = 3): PersonalTask[] {
  const open = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  return [...open].sort((a, b) => (b.level ?? localGuess(b).level) - (a.level ?? localGuess(a).level) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, max)
}
