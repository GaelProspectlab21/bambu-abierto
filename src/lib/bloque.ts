/**
 * El bloque de enfoque simple (v10.2): varias tareas en un solo bloque.
 *
 * Las tareas del bloque viajan en `micro` (ya existía): cada una con el id de su tarea si viene
 * de tu lista, o un id nuevo si la escribiste ahí. Así no cambia la forma de los registros.
 * Al cerrar, las que palomeaste quedan hechas en tu lista.
 */
import { dateKey, makeId, type ActiveFocus, type AppData, type Focus, type Micro } from './model'
import { activeSeconds } from './focusStats'

export const TASK_ID = 'tarea:'

export type Pick = { id?: string; text: string }

/** Nombre corto del bloque: "Grabar intro" o "Grabar intro y 2 más". */
export function blockTitle(picks: Pick[]): string {
  const first = picks[0]?.text.trim() ?? ''
  return picks.length > 1 ? `${first} y ${picks.length - 1} más` : first
}

export function startBlock(data: AppData, picks: Pick[], minutes: number, now = Date.now(), extra: { level?: number; goal?: string } = {}): AppData {
  const clean = picks.filter(p => p.text.trim()).slice(0, 8)
  if (!clean.length) return data
  const micro: Micro[] = clean.map(p => ({ id: p.id ? `${TASK_ID}${p.id}` : makeId(), text: p.text.trim().slice(0, 200), done: false }))
  const taskIds = clean.filter(p => p.id).map(p => p.id!)
  const levels = data.tasks.filter(t => taskIds.includes(t.id) && t.level).map(t => Math.round(t.level!))
  const active: ActiveFocus = {
    task: blockTitle(clean).slice(0, 300), startedAt: now, plannedMinutes: minutes, phase: 'active', micro,
    level: extra.level ?? (levels.length ? Math.max(...levels) : 3),
    ...(taskIds.length ? { taskIds } : {}), ...(taskIds.length === 1 ? { taskId: taskIds[0] } : {}),
    ...(extra.goal?.trim() ? { goal: extra.goal.trim() } : {}),
  }
  return { ...data, activeFocus: active, settings: { ...data.settings, pendingCue: undefined },
    tasks: data.tasks.map(t => taskIds.includes(t.id) ? { ...t, status: 'in_progress', updatedAt: now } : t) }
}

export function toggleItem(data: AppData, id: string): AppData {
  const a = data.activeFocus
  if (!a) return data
  return { ...data, activeFocus: { ...a, micro: (a.micro ?? []).map(m => m.id === id ? { ...m, done: !m.done } : m) } }
}

export function addItem(data: AppData, text: string): AppData {
  const a = data.activeFocus
  if (!a || !text.trim() || (a.micro ?? []).length >= 8) return data
  return { ...data, activeFocus: { ...a, micro: [...(a.micro ?? []), { id: makeId(), text: text.trim().slice(0, 200), done: false }] } }
}

/**
 * Guarda el bloque. Las tareas de tu lista que palomeaste quedan hechas; las que no, vuelven a
 * pendientes. Lo que escribiste suelto y no terminaste se puede mandar a tu lista.
 */
export function closeBlock(data: AppData, opts: { score: number; result?: string; minutes?: number; leftoversToTasks?: boolean }, now = Date.now()): AppData {
  const a = data.activeFocus
  if (!a) return data
  const seconds = activeSeconds(a, a.endedAt ?? now)
  const real = Math.max(1, Math.round(seconds / 60))
  const micro = a.micro ?? []
  const doneIds = micro.filter(m => m.done && m.id.startsWith(TASK_ID)).map(m => m.id.slice(TASK_ID.length))
  const doneText = micro.filter(m => m.done).map(m => m.text)
  const result = opts.result?.trim() || (doneText.length ? `Terminé: ${doneText.join(', ')}` : 'Avancé')
  const row: Focus = {
    id: `focus:${makeId()}`, day: dateKey(new Date(a.startedAt)), task: a.task, minutes: Math.min(opts.minutes ?? real, real), result: result.slice(0, 1000),
    source: 'bambu', status: 'completed', level: a.level, plannedMinutes: a.plannedMinutes ?? 45, startedAt: a.startedAt, endedAt: a.endedAt ?? now,
    focusScore: opts.score, pausedSeconds: Math.round((a.pausedMilliseconds ?? 0) / 1000),
    ...(a.goal ? { goal: a.goal } : {}), ...(micro.length ? { micro } : {}), ...(a.captured?.length ? { captured: a.captured } : {}),
    ...(a.pauses?.length ? { pauses: a.pauses } : {}), ...(a.taskId ? { taskId: a.taskId } : {}),
  }
  const linked = a.taskIds ?? (a.taskId ? [a.taskId] : [])
  const leftovers = opts.leftoversToTasks ? micro.filter(m => !m.done && !m.id.startsWith(TASK_ID)) : []
  const tasks = data.tasks.map(t => doneIds.includes(t.id) ? { ...t, status: 'done' as const, completedOn: dateKey(), updatedAt: now }
    : linked.includes(t.id) && t.status === 'in_progress' ? { ...t, status: 'pending' as const, updatedAt: now } : t)
  const extra = leftovers.map(m => ({ id: makeId(), text: m.text, status: 'pending' as const, minutes: 25, level: null, updatedAt: now, notes: '', project: '', subtasks: [], dueDate: dateKey() }))
  return { ...data, activeFocus: null, focus: [...data.focus, row], tasks: [...extra, ...tasks] }
}
