export type Provenance = {
  source?: 'bambu' | 'codice' | 'cauce' | 'user_estimate'
  sourceId?: string
  estimated?: boolean
  durationKnown?: boolean
  status?: string
  title?: string
  taskId?: string
  estimateReason?: string
  /** Gael confirmó que leyó ese día aunque los minutos sean estimados: cuenta para la racha. */
  dayConfirmed?: boolean
}

export type PersonalTask = {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  minutes: number
  level: number | null
  updatedAt: number
  sourceId?: string
  dueDate?: string
  notes?: string
  project?: string
  completedOn?: string
  subtasks?: { id: string; text: string; done: boolean }[]
}

export function provenance(value: Record<string, unknown>): Provenance {
  const allowed = ['bambu', 'codice', 'cauce', 'user_estimate']
  const source = typeof value.source === 'string' && allowed.includes(value.source)
    ? value.source as Provenance['source'] : undefined
  return {
    ...(value.durationKnown === false ? { durationKnown: false } : {}),
    ...(typeof value.status === 'string' ? { status: value.status.slice(0, 40) } : {}),
    ...(typeof value.title === 'string' ? { title: value.title.slice(0, 300) } : {}),
    ...(typeof value.taskId === 'string' ? { taskId: value.taskId.slice(0, 160) } : {}),
    ...(source ? { source } : {}),
    ...(typeof value.sourceId === 'string' ? { sourceId: value.sourceId.slice(0, 160) } : {}),
    ...(value.estimated === true ? { estimated: true } : {}),
    ...(value.dayConfirmed === true ? { dayConfirmed: true } : {}),
    ...(typeof value.estimateReason === 'string'
      ? { estimateReason: value.estimateReason.slice(0, 300) } : {}),
  }
}

function taskDay(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value ? value : undefined
}

export function normalizeTasks(value: unknown): PersonalTask[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 5000).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.text !== 'string' || !row.text.trim()) return []
    const minutes = Number(row.minutes)
    const level = row.level === null ? null : Number(row.level)
    return [{
      id: row.id.slice(0, 160), text: row.text.trim().slice(0, 200),
      status: row.status === 'done' ? 'done' as const
        : row.status === 'archived' ? 'archived' as const : row.status === 'in_progress' ? 'in_progress' as const : 'pending' as const,
      minutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 180 ? minutes : 25,
      level: level !== null && Number.isFinite(level) && level >= 1 && level <= 4 ? level : null,
      dueDate: taskDay(row.dueDate),
      completedOn: taskDay(row.completedOn),
      notes: typeof row.notes === 'string' ? row.notes.slice(0, 4000) : '',
      project: typeof row.project === 'string' ? row.project.slice(0, 60) : '',
      subtasks: Array.isArray(row.subtasks) ? row.subtasks.slice(0, 100).filter((s): s is {id:string;text:string;done:boolean} => !!s && typeof s === 'object' && typeof s.id === 'string' && typeof s.text === 'string').map(s => ({ id: s.id.slice(0, 80), text: s.text.slice(0, 200), done: s.done === true })) : [],
      updatedAt: Number.isFinite(row.updatedAt) ? Number(row.updatedAt) : 0,
      ...(typeof row.sourceId === 'string' ? { sourceId: row.sourceId.slice(0, 160) } : {}),
    }]
  })
}
