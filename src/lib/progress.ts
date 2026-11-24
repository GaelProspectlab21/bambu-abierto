import { dateKey, type AppData, type Reading } from './model'

export function shiftDay(day: string, count: number): string {
  const value = new Date(`${day}T12:00:00`)
  value.setDate(value.getDate() + count)
  return dateKey(value)
}
export function realReading(row: Reading): boolean {
  // Un día estimado cuenta para la racha solo si Gael confirmó que sí leyó (dayConfirmed).
  return (!row.estimated || row.dayConfirmed === true) && (row.minutes > 0 || (row.seconds ?? 0) > 0 || row.source === 'codice')
}
export function streak(dates: Iterable<string>, today = dateKey()) {
  const days = [...new Set(dates)].filter(day => day <= today).sort()
  let best = 0, run = 0
  days.forEach((day, i) => { run = i && shiftDay(days[i - 1], 1) === day ? run + 1 : 1; best = Math.max(best, run) })
  const set = new Set(days)
  let anchor = set.has(today) ? today : shiftDay(today, -1)
  let current = 0
  while (set.has(anchor)) { current++; anchor = shiftDay(anchor, -1) }
  return { current, best, total: days.length, todayDone: set.has(today), days }
}
export function progress(data: AppData, today = dateKey()) {
  const reading = streak(data.reading.filter(realReading).map(row => row.day), today)
  const focusDays = new Set(data.focus.filter(row => row.day <= today && row.minutes > 0 && row.durationKnown !== false && (!row.status || row.status === 'completed')).map(row => row.day))
  const habitDays = Object.entries(data.habits).filter(([day, ids]) => day <= today && ids.length)
  const done = (data.tasks ?? []).filter(task => task.status === 'done')
  const allDays = new Set([...reading.days, ...focusDays, ...habitDays.map(([day]) => day), ...done.flatMap(task => task.completedOn ? [task.completedOn] : [])])
  const xp = reading.total * 25 + focusDays.size * 20 + habitDays.reduce((sum, [, ids]) => sum + Math.min(new Set(ids).size, 7) * 5, 0) + done.length * 10
  const stages = [{ name: 'Semilla', at: 0 }, { name: 'Brote', at: 3 }, { name: 'Raíces', at: 7 }, { name: 'Tallo', at: 21 }, { name: 'Jardín', at: 60 }]
  const stage = [...stages].reverse().find(item => allDays.size >= item.at)!
  const next = stages.find(item => item.at > allDays.size)
  const achievements = [
    { name: 'Primera página', description: 'Un día de lectura', unlocked: reading.total >= 1 },
    { name: 'Una semana seguida', description: 'Racha de 7 días de lectura', unlocked: reading.best >= 7 },
    { name: 'Lector constante', description: 'Racha de 30 días de lectura', unlocked: reading.best >= 30 },
    { name: 'Tiempo protegido', description: 'Enfoque en 10 días distintos', unlocked: focusDays.size >= 10 },
    { name: 'Pendientes resueltos', description: '5 tareas hechas', unlocked: done.length >= 5 },
    { name: 'Raíces firmes', description: 'Actividad en 30 días distintos', unlocked: allDays.size >= 30 },
  ]
  return { reading, xp, level: Math.floor(xp / 150) + 1, levelXP: xp % 150, stage, next, activeDays: allDays.size, achievements }
}

export type BackfillDay = { day: string; read: boolean; minutes: number; isToday: boolean }
/** Los últimos `n` días (hoy al final): cuáles leíste y cuánto. Es la banda para rellenar lo olvidado. */
export function backfillDays(data: AppData, today = dateKey(), n = 14): BackfillDay[] {
  return Array.from({ length: n }, (_, i) => {
    const day = shiftDay(today, i - (n - 1))
    const rows = data.reading.filter(r => r.day === day && realReading(r))
    return { day, read: rows.length > 0, minutes: Math.round(rows.reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60), isToday: day === today }
  })
}
