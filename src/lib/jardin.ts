import { activeHabits, dateKey, type AppData, type HabitDef } from './model'
import { realReading } from './progress'
import { routineFor, routineProgress } from './rutina'
import { walkDone } from './cardio'

export const GOOD = 0.8
export const WAKE_PREFIX = 'Despertar:'

export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function habitOn(data: AppData, habit: HabitDef, day: string): boolean {
  if ((data.habits[day] ?? []).includes(habit.id)) return true
  if (habit.auto === 'training') return data.sets.some(s => s.day === day)
  if (habit.auto === 'reading') return data.reading.some(r => r.day === day && realReading(r))
  if (habit.auto === 'bible') return data.bible.some(b => b.day === day)
  return false
}

export function tasksFor(data: AppData, day: string) {
  return data.tasks.filter(t => t.status !== 'archived' && (t.dueDate === day || (t.status === 'done' && t.completedOn === day && !t.dueDate)))
}

export type DayScore = { day: string; done: number; total: number; pct: number; trained: number | null }
export function dayScore(data: AppData, day: string): DayScore {
  const habits = activeHabits(data.settings)
  let done = habits.filter(h => habitOn(data, h, day)).length
  let total = habits.length
  const rt = data.settings.modules?.training === false ? null : routineFor(data, day)
  let trained: number | null = null
  if (rt) {
    const p = routineProgress(data, day, rt)
    trained = p.total ? p.done / p.total : 0
    done += trained
    total += 1
  }
  const tasks = tasksFor(data, day)
  done += tasks.filter(t => t.status === 'done').length
  total += tasks.length
  if (data.settings.walkDaily) {
    total += 1
    if (walkDone(data, day)) done += 1
  }
  if (data.settings.modules?.reading !== false) {
    total += 1
    if (data.reading.some(r => r.day === day && realReading(r))) done += 1
  }
  return { day, done, total, pct: total ? Math.min(1, done / total) : 0, trained }
}

export function stage(pct: number): 0 | 1 | 2 | 3 | 4 {
  if (pct <= 0) return 0
  if (pct < 0.4) return 1
  if (pct < GOOD) return 2
  if (pct < 1) return 3
  return 4
}

export function firstDay(data: AppData, today: string): string {
  const days = [
    ...Object.keys(data.habits), ...data.sets.map(s => s.day), ...data.tasks.flatMap(t => t.completedOn ? [t.completedOn] : []),
    ...data.reading.map(r => r.day), ...data.activities.map(a => a.day),
  ].filter(d => d <= today).sort()
  return days[0] ?? today
}

export type GardenStats = { current: number; best: number; week: number; month: number; perfect: number; trainings: number; started: string; frozen: string[]; freezeWeek: string | null }
const mondayKey = (d: string) => shiftDay(d, -((new Date(`${d}T12:00:00`).getDay() + 6) % 7))
export function gardenStats(data: AppData, today = dateKey()): GardenStats {
  const start = firstDay(data, today)
  const good = new Set<string>()
  const frozen: string[] = []
  const used = new Set<string>()
  let perfect = 0
  for (let d = start, i = 0; d <= today && i < 800; d = shiftDay(d, 1), i++) {
    const sc = dayScore(data, d)
    if (sc.pct >= GOOD) good.add(d)
    else if (d < today && !used.has(mondayKey(d))) { used.add(mondayKey(d)); frozen.push(d) }
    if (sc.pct >= 1) perfect++
  }
  const keep = new Set([...good, ...frozen])
  let current = 0
  for (let a = good.has(today) ? today : shiftDay(today, -1); keep.has(a) && a >= start; a = shiftDay(a, -1)) if (good.has(a)) current++
  let run = 0, best = 0
  for (let d = start, i = 0; d <= today && i < 800; d = shiftDay(d, 1), i++) {
    if (keep.has(d)) { if (good.has(d)) run++; best = Math.max(best, run) } else if (d < today) run = 0
  }
  const st = { current, best }
  const thisMonday = mondayKey(today)
  const freezeWeek = frozen.find(d => d >= thisMonday) ?? null
  const avg = (from: string) => {
    const rows: number[] = []
    for (let d = from < start ? start : from; d <= today; d = shiftDay(d, 1)) rows.push(dayScore(data, d).pct)
    return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0
  }
  const monday = shiftDay(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7))
  const month = `${today.slice(0, 7)}-01`
  const trainings = new Set(data.sets.filter(s => s.day >= month && s.day <= today).map(s => s.day)).size
  return { current: st.current, best: st.best, week: avg(monday), month: avg(month), perfect, trainings, started: start, frozen, freezeWeek }
}

export function habitFrequency(data: AppData, habit: HabitDef, today: string, days = 28): { marks: boolean[]; pct: number } {
  const marks = Array.from({ length: days }, (_, i) => habitOn(data, habit, shiftDay(today, i - days + 1)))
  return { marks, pct: marks.filter(Boolean).length / days }
}

export function gardenWeeks(today: string, weeks: number): string[][] {
  const monday = shiftDay(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7))
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => shiftDay(monday, (w - weeks + 1) * 7 + d)))
}

export function wakeOn(data: AppData, day: string): string | null {
  const row = data.activities.filter(a => a.day === day && a.kind === 'other' && a.note?.startsWith(WAKE_PREFIX)).at(0)
  return row ? row.note!.slice(WAKE_PREFIX.length).trim() : null
}
