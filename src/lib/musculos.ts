import type { AppData, TrainingSet } from './model'
import { exerciseList } from './libre'
import { musculoDeNombre } from './musculoNombre'

export type Muscle = 'Pecho' | 'Espalda' | 'Hombros' | 'Brazos' | 'Abdomen' | 'Piernas'
export const MUSCLES: Muscle[] = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas']

const BY_GROUP: Record<string, Muscle> = { Pecho: 'Pecho', Espalda: 'Espalda', Hombros: 'Hombros', Abdomen: 'Abdomen', Piernas: 'Piernas', 'Bíceps': 'Brazos', 'Tríceps': 'Brazos', Antebrazo: 'Brazos' }
export function muscleOf(name: string, group: string): Muscle | null {
  if (BY_GROUP[group]) return BY_GROUP[group]
  return musculoDeNombre(name)
}

export type Period = 'semana' | 'mes' | 'siempre'
export const PERIODS: { id: Period; name: string; days: number | null }[] = [{ id: 'semana', name: '7 días', days: 7 }, { id: 'mes', name: '30 días', days: 30 }, { id: 'siempre', name: 'Siempre', days: null }]
export type MuscleStat = { muscle: Muscle; sets: number; reps: number; seconds: number; days: number; lastDay: string | null; level: 0 | 1 | 2 | 3; top: { name: string; best: number; kind: 'reps' | 'seconds' }[] }

const counts = (s: TrainingSet) => s.note !== 'hecho' && ((s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0)
function shift(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function muscleStats(data: AppData, today: string, period: Period = 'mes'): Record<Muscle, MuscleStat> {
  const groups = new Map(exerciseList(data).map(e => [e.name, e.group]))
  const span = PERIODS.find(p => p.id === period)!.days
  const from = span ? shift(today, -(span - 1)) : ''
  const out = Object.fromEntries(MUSCLES.map(m => [m, { muscle: m, sets: 0, reps: 0, seconds: 0, days: 0, lastDay: null, level: 0, top: [] }])) as unknown as Record<Muscle, MuscleStat>
  const days = new Map<Muscle, Set<string>>()
  const best = new Map<Muscle, Map<string, { best: number; kind: 'reps' | 'seconds' }>>()
  for (const s of data.sets) {
    if (!counts(s) || s.day > today || s.day < from) continue
    const m = muscleOf(s.exercise, groups.get(s.exercise) ?? 'Míos')
    if (!m) continue
    const st = out[m]
    st.sets += 1
    st.reps += s.reps ?? 0
    st.seconds += s.seconds ?? 0
    if (!st.lastDay || s.day > st.lastDay) st.lastDay = s.day
    days.set(m, (days.get(m) ?? new Set()).add(s.day))
    const kind = s.seconds !== undefined ? 'seconds' : 'reps'
    const v = kind === 'seconds' ? s.seconds ?? 0 : s.reps ?? 0
    const map = best.get(m) ?? new Map()
    if (v > (map.get(s.exercise)?.best ?? 0)) map.set(s.exercise, { best: v, kind })
    best.set(m, map)
  }
  const top = Math.max(1, ...MUSCLES.map(m => out[m].sets))
  for (const m of MUSCLES) {
    const st = out[m]
    st.days = days.get(m)?.size ?? 0
    st.level = st.sets === 0 ? 0 : st.sets / top >= 0.66 ? 3 : st.sets / top >= 0.33 ? 2 : 1
    st.top = [...(best.get(m) ?? new Map()).entries()].map(([name, r]) => ({ name, ...r })).sort((a, b) => b.best - a.best).slice(0, 3)
  }
  return out
}

export function bodyAdvice(stats: Record<Muscle, MuscleStat>): string {
  const all = MUSCLES.map(m => stats[m]).sort((a, b) => b.sets - a.sets)
  if (!all[0].sets) return 'Todavía no hay series en este periodo.'
  const least = all.filter(s => s.sets < all[0].sets).at(-1)
  const n = (k: number) => `${k} ${k === 1 ? 'serie' : 'series'}`
  return `Lo que más entrenas: ${all[0].muscle.toLowerCase()} (${n(all[0].sets)}).${least ? ` Lo que menos: ${least.muscle.toLowerCase()} (${n(least.sets)}).` : ''}`
}

/**
 * v12: series por semana contra un rango sano (suma de los rangos del catálogo de cada músculo, para
 * 13 años y método Juanma: más no es mejor si no recuperas). Con eso "Tu cuerpo" dice qué te toca.
 */
export const RANGO_SEMANAL: Record<Muscle, [number, number]> = { Pecho: [6, 14], Espalda: [6, 14], Hombros: [4, 10], Brazos: [6, 16], Abdomen: [4, 10], Piernas: [10, 24] }
export type Balance = { muscle: Muscle; porSemana: number; rango: [number, number]; estado: 'falta' | 'bien' | 'mucho'; recuperando: boolean }
export function balance(stats: Record<Muscle, MuscleStat>, period: Period, today: string): { filas: Balance[]; teToca: Muscle | null } {
  const semanas = period === 'semana' ? 1 : period === 'mes' ? 30 / 7 : null
  const ayer = shift(today, -1)
  const filas = MUSCLES.map(m => {
    const porSemana = semanas ? Math.round(stats[m].sets / semanas * 10) / 10 : stats[m].sets
    const [lo, hi] = RANGO_SEMANAL[m]
    return { muscle: m, porSemana, rango: RANGO_SEMANAL[m], estado: (porSemana < lo ? 'falta' : porSemana > hi ? 'mucho' : 'bien') as Balance['estado'], recuperando: !!stats[m].lastDay && stats[m].lastDay! >= ayer }
  })
  // Lo que te toca: lo más lejos de su rango que ya descansó. Sin periodo medible no hay sugerencia.
  const toca = semanas ? filas.filter(f => f.estado === 'falta' && !f.recuperando).sort((a, b) => a.porSemana / a.rango[0] - b.porSemana / b.rango[0])[0] : undefined
  return { filas, teToca: toca?.muscle ?? null }
}
