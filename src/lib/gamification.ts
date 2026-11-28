/**
 * Experiencia, niveles, misiones del día y logros.
 *
 * Regla de la casa: se premia lo que hiciste, nunca con recompensas al azar (las mismas
 * fuentes de Cauce advierten que el refuerzo aleatorio engancha como tragamonedas).
 * Todo sale de tus registros y se puede recalcular desde cero en cualquier momento.
 */
import { activeHabits, dateKey, modulesOf, type AppData } from './model'
import { realReading, streak } from './progress'
import { isHard, personalBest, sessionKind, shift, weekSessions } from './coach'
import { BOOKS, bibleProgress } from './bible'
import { counts } from './focusStats'
import { exercise } from './exercises'
import { gave } from './measure'
import { plural } from './text'

export const XP_RULES = [
  ['Día de lectura', 25], ['Capítulo de la Biblia', 2], ['Bloque de enfoque (por cada 15 min)', 5], ['Serie dura (máx. 30 al día)', 3],
  ['Sesión de entreno completa', 20], ['Fútbol', 15], ['Check-in', 5], ['Hábito marcado', 5], ['Tarea hecha', 10], ['Día completo (todas las misiones)', 25], ['Semana sólida (5 días con 3 misiones o más)', 40], ['Diste lo que traías (tu medida del día)', 25],
] as const

/** Primer día en que se usó Bambú. Lo anterior viene de Códice y Cauce y se cuenta aparte. */
export const BAMBU_START = '2026-11-02'
const WEEK_GOAL = 5, WEEK_BONUS = 40

const RANKS = ['Semilla', 'Brote', 'Raíces', 'Tallo', 'Caña', 'Bambú joven', 'Bambú firme', 'Bosquecito', 'Bosque', 'Bosque antiguo']

export type Quest = { id: string; label: string; done: boolean; go: 'Lectura' | 'Entrenar' | 'Enfoque' | 'Hoy' | 'Noche' }
export type Achievement = { id: string; area: 'Lectura' | 'Entreno' | 'Enfoque' | 'Hábitos'; name: string; description: string; unlocked: boolean; progress: number }
export type Game = {
  xp: number; level: number; rank: string; nextRank: string; levelStart: number; levelEnd: number
  quests: Quest[]; questsDone: number; dayComplete: boolean; perfectDays: number; perfectStreak: number
  achievements: Achievement[]; todayXp: number; rankInfo: RankInfo
  heritageXp: number; bambuXp: number; bambuDay: number
  /** La medida del día: ¿diste lo que traías? `today` es null si aún no la registras. */
  gave: { today: boolean | null; streak: number; week: number }
  week: { goal: number; good: number; bonus: boolean; days: { day: string; good: boolean; future: boolean }[] }
}

/** Cada 3 niveles el bambú cambia de etapa. La imagen de cada etapa vive en public/img. */
const LEVELS_PER_RANK = 3
const RANK_FILES = ['semilla', 'brote', 'raices', 'tallo', 'cana', 'joven', 'firme', 'bosquecito', 'bosque', 'antiguo']
export type RankInfo = { index: number; name: string; image: string; next: { name: string; image: string; level: number } | null }
export function rankImage(index: number): string {
  return `img/rango-${String(index + 1).padStart(2, '0')}-${RANK_FILES[index]}.svg`
}
export function rankOf(level: number): RankInfo {
  const index = Math.min(RANKS.length - 1, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_RANK))
  const n = index + 1
  return { index, name: RANKS[index], image: rankImage(index),
    next: n < RANKS.length ? { name: RANKS[n], image: rankImage(n), level: n * LEVELS_PER_RANK + 1 } : null }
}

type DayEntry = { reading: boolean; readSec: number; bible: number; focusMin: number; focusAny: boolean; sets: AppData['sets']; football: boolean; rest: boolean; checkin: boolean; tasks: number; capacity?: number; given?: number }
type DayIndex = Map<string, DayEntry>
function indexByDay(data: AppData): DayIndex {
  const map: DayIndex = new Map()
  const get = (day: string) => {
    let e = map.get(day)
    if (!e) { e = { reading: false, readSec: 0, bible: 0, focusMin: 0, focusAny: false, sets: [], football: false, rest: false, checkin: false, tasks: 0 }; map.set(day, e) }
    return e
  }
  // Códice importado sin duración cuenta como los 5 minutos (igual que en la racha).
  data.reading.forEach(r => { if (!realReading(r)) return; const e = get(r.day); e.reading = true; e.readSec += r.seconds ?? (r.minutes > 0 ? r.minutes * 60 : 300) })
  // XP de capítulo solo por capítulos completos; un parcial deja el día como activo.
  data.bible.forEach(b => { const e = get(b.day); if (!b.verses) e.bible++ })
  data.focus.forEach(f => { if (counts(f)) { const e = get(f.day); e.focusMin += f.minutes; e.focusAny = true } })
  data.sets.forEach(x => { get(x.day).sets.push(x) })
  data.activities.forEach(a => { const e = get(a.day); if (a.kind === 'football') e.football = true; if (a.kind === 'rest' || a.kind === 'walk') e.rest = true }) // caminar es el descanso activo que pide el coach
  data.checkins.forEach(c => { const e = get(c.day); e.checkin = true; e.capacity = c.capacity; e.given = c.given })
  data.tasks.forEach(t => { if (t.status === 'done' && t.completedOn) get(t.completedOn).tasks++ })
  Object.keys(data.habits).forEach(d => get(d))
  return map
}
const EMPTY_DAY: DayEntry = { reading: false, readSec: 0, bible: 0, focusMin: 0, focusAny: false, sets: [], football: false, rest: false, checkin: false, tasks: 0 }

/** Diste lo que traías: tu "dado" alcanza (o casi) tu "capacidad" de ese día. No importa si el número era 20 o 100. */
export function gaveAll(e: { capacity?: number; given?: number }): boolean {
  return e.capacity !== undefined && e.given !== undefined && gave(e.capacity, e.given)
}

export function levelFor(xp: number): { level: number; start: number; end: number } {
  // Cada nivel pide un poco más que el anterior: 100, 220, 360, 520...
  let level = 1, start = 0, step = 100
  while (xp >= start + step) { start += step; level++; step += 20 }
  return { level, start, end: start + step }
}

function dayXp(data: AppData, day: string, index: DayIndex, complete: boolean): number {
  const e = index.get(day) ?? EMPTY_DAY
  let xp = (e.reading ? 25 : 0) + e.bible * 2 + Math.floor(e.focusMin / 15) * 5 + Math.min(30, e.sets.filter(isHard).length * 3)
  if (e.sets.length >= 6 && sessionKind(e.sets)) xp += 20
  if (e.football) xp += 15
  if (e.checkin) xp += 5
  xp += (data.habits[day] ?? []).length * 5 + e.tasks * 10
  if (complete) xp += 25
  if (gaveAll(e)) xp += 25
  return xp
}

export function questsFor(data: AppData, day: string, index = indexByDay(data)): Quest[] {
  const e = index.get(day) ?? EMPTY_DAY
  const m = modulesOf(data.settings)
  const habits = activeHabits(data.settings)
  const marked = habits.filter(h => (data.habits[day] ?? []).includes(h.id)).length
  const need = Math.min(3, habits.length)
  const all: (Quest | null)[] = [
    m.reading ? { id: 'read', label: 'Leer al menos 5 minutos', done: e.readSec >= 300, go: 'Lectura' } : null,
    m.training ? { id: 'train', label: 'Entrenar, jugar o descansar a propósito', done: e.sets.length >= 4 || e.football || e.rest, go: 'Entrenar' } : null,
    m.focus ? { id: 'focus', label: 'Un bloque de enfoque', done: e.focusAny, go: 'Enfoque' } : null,
    { id: 'checkin', label: 'Medir tu día (con cuánto amaneciste)', done: e.checkin, go: 'Hoy' },
    habits.length ? { id: 'habits', label: `Marcar ${plural(need, 'hábito', 'hábitos')}`, done: marked >= need, go: 'Hoy' } : null,
  ]
  return all.filter((q): q is Quest => q !== null)
}

/** Un día sólido: la mayoría de las misiones, o diste todo lo que traías aunque fuera poco. */
export function isSolid(qs: Quest[], e: { capacity?: number; given?: number }): boolean {
  const need = Math.min(3, Math.max(1, Math.ceil(qs.length * 0.6)))
  return qs.filter(q => q.done).length >= need || gaveAll(e)
}

export function game(data: AppData, today = dateKey()): Game {
  const index = indexByDay(data)
  const days = [...index.keys()].filter(d => d <= today)
  let heritageXp = 0, bambuXp = 0, todayXp = 0, perfectDays = 0
  const perfect = new Set<string>(), solid = new Set<string>()
  const add = (day: string, xp: number) => { if (day < BAMBU_START) heritageXp += xp; else bambuXp += xp }
  for (const day of days) {
    const qs = questsFor(data, day, index)
    const complete = qs.every(q => q.done)
    const gained = dayXp(data, day, index, complete)
    add(day, gained)
    if (day === today) todayXp = gained
    if (complete) { perfectDays++; perfect.add(day) }
    if (isSolid(qs, index.get(day) ?? EMPTY_DAY)) solid.add(day)
  }
  // Semana sólida: 5 días de la semana con 3 misiones o más. El bono cae el día que se alcanza la quinta.
  const perWeek = new Map<string, string[]>()
  ;[...solid].sort().forEach(d => perWeek.set(weekOf(d), [...(perWeek.get(weekOf(d)) ?? []), d]))
  perWeek.forEach(list => { if (list.length >= WEEK_GOAL) add(list[WEEK_GOAL - 1], WEEK_BONUS) })
  const xp = heritageXp + bambuXp
  const gaveDays = new Set(days.filter(d => gaveAll(index.get(d) ?? EMPTY_DAY)))
  const todayRow = index.get(today)
  const gaveToday = todayRow?.given === undefined ? null : gaveAll(todayRow)
  let gaveStreak = 0
  for (let d = gaveDays.has(today) ? today : shift(today, -1); gaveDays.has(d); d = shift(d, -1)) gaveStreak++
  let perfectStreak = 0
  for (let d = perfect.has(today) ? today : shift(today, -1); perfect.has(d); d = shift(d, -1)) perfectStreak++
  const { level, start, end } = levelFor(xp)
  const quests = questsFor(data, today, index)
  const r = rankOf(level)
  const monday = weekOf(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => shift(monday, i)).map(day => ({ day, good: solid.has(day), future: day > today }))
  const good = weekDays.filter(d => d.good).length
  const bambuDay = Math.max(1, Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${BAMBU_START}T12:00:00`).getTime()) / 86400000) + 1)
  return {
    xp, level, levelStart: start, levelEnd: end, rank: r.name, nextRank: r.next?.name ?? r.name, rankInfo: r,
    quests, questsDone: quests.filter(q => q.done).length, dayComplete: quests.every(q => q.done), perfectDays, perfectStreak,
    achievements: achievements(data, today, perfectDays), todayXp, heritageXp, bambuXp, bambuDay,
    gave: { today: gaveToday, streak: gaveStreak, week: weekDays.filter(d => gaveDays.has(d.day)).length },
    week: { goal: WEEK_GOAL, good, bonus: good >= WEEK_GOAL, days: weekDays },
  }
}

function ach(id: string, area: Achievement['area'], name: string, description: string, value: number, goal: number): Achievement {
  return { id, area, name, description, unlocked: value >= goal, progress: Math.min(1, goal ? value / goal : 0) }
}

export function achievements(data: AppData, today = dateKey(), perfectDays = 0): Achievement[] {
  const rs = streak(data.reading.filter(realReading).map(r => r.day), today)
  const bible = bibleProgress(data, data.settings.bibleOrder, today)
  const fullBooks = [...bible.byBook.entries()].filter(([id, marks]) => [...marks.values()].filter(x => !x.verses).length >= BOOKS[id - 1].chapters).length
  const byDay = new Map<string, AppData['sets']>()
  data.sets.forEach(x => byDay.set(x.day, [...(byDay.get(x.day) ?? []), x]))
  const sessions = [...byDay.values()].filter(list => list.length >= 6 && sessionKind(list)).length
  const climbed = [...new Set(data.sets.map(s => s.exercise))].filter(id => { const e = exercise(id); return e && e.level > 1 }).length
  const neckWeeks = new Set(data.sets.filter(s => exercise(s.exercise)?.slot.startsWith('cuello')).map(s => weekOf(s.day))).size
  const prs = [...new Set(data.sets.map(s => s.exercise))].filter(id => { const best = personalBest(data, id); const first = data.sets.filter(s => s.exercise === id).sort((a, b) => a.at - b.at)[0]; return best && first && best.id !== first.id }).length
  const fullWeek = [0, 1, 2, 3].some(k => { const w = weekSessions(data, shift(today, -7 * k)); return w.torso >= 3 && w.pierna >= (data.settings.footballDays.length >= 3 ? 1 : 2) })
  const focusMinutes = data.focus.filter(counts).reduce((s, f) => s + f.minutes, 0)
  const doneTasks = data.tasks.filter(t => t.status === 'done').length
  return [
    ach('read-7', 'Lectura', 'Una semana seguida', '7 días seguidos leyendo', rs.best, 7),
    ach('read-30', 'Lectura', 'Lector constante', '30 días seguidos', rs.best, 30),
    ach('read-70', 'Lectura', 'Raíz profunda', '70 días seguidos', rs.best, 70),
    ach('read-100d', 'Lectura', 'Cien días', '100 días con lectura', rs.total, 100),
    ach('read-365', 'Lectura', 'Un año de páginas', '365 días seguidos', rs.best, 365),
    ach('bible-10', 'Lectura', 'Diez por ciento', '10% de la Biblia', bible.percent, 10),
    ach('bible-book', 'Lectura', 'Libro completo', 'Terminar un libro de la Biblia', fullBooks, 1),
    ach('bible-25', 'Lectura', 'Un cuarto del camino', '25% de la Biblia', bible.percent, 25),
    ach('train-1', 'Entreno', 'Primera serie', 'Registrar tu primera serie', data.sets.length, 1),
    ach('train-10', 'Entreno', 'Diez sesiones', '10 sesiones completas del plan', sessions, 10),
    ach('train-50', 'Entreno', 'Cincuenta sesiones', '50 sesiones completas', sessions, 50),
    ach('train-pr', 'Entreno', 'Récord', 'Superar tu marca en un ejercicio', prs, 1),
    ach('train-climb', 'Entreno', 'Subiste de escalón', 'Registrar una variante más difícil', climbed, 3),
    ach('train-neck', 'Entreno', 'Cuello de acero', 'Cuello en 4 semanas distintas', neckWeeks, 4),
    ach('train-week', 'Entreno', 'Semana completa', 'Torso 3 veces y tu pierna en una semana', fullWeek ? 1 : 0, 1),
    ach('focus-10h', 'Enfoque', 'Diez horas', '10 horas de enfoque', focusMinutes / 60, 10),
    ach('focus-100h', 'Enfoque', 'Cien horas', '100 horas de enfoque', focusMinutes / 60, 100),
    ach('focus-200h', 'Enfoque', 'Doscientas horas', '200 horas de enfoque', focusMinutes / 60, 200),
    ach('tasks-25', 'Enfoque', 'Pendientes resueltos', '25 tareas hechas', doneTasks, 25),
    ach('day-1', 'Hábitos', 'Día completo', 'Cumplir las 5 misiones de un día', perfectDays, 1),
    ach('day-7', 'Hábitos', 'Siete días completos', '7 días con todas las misiones', perfectDays, 7),
    ach('day-30', 'Hábitos', 'Mes de raíz', '30 días completos', perfectDays, 30),
  ]
}

function weekOf(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  return shift(day, -((d.getDay() + 6) % 7))
}
