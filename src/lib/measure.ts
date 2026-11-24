/**
 * La medida del día: con cuánto amaneciste (capacidad) contra cuánto diste de eso.
 * La vara es TUYA de ese día. Dar el 100% de un 20% cuenta igual que dar el 100% de un 100%.
 * Nada aquí premia hacer más de lo que traías: al revés, avisa cuando llevas días dando de más.
 */
import { shift } from './coach'
import type { AppData } from './model'
import { plural } from './text'

export type Verdict = { kind: 'todo' | 'parte' | 'mas'; text: string }
export const TOLERANCE = 5

export function gave(capacity: number, given: number): boolean { return given >= capacity - TOLERANCE }

export function verdict(capacity: number, given: number): Verdict {
  if (given > capacity + 10) return { kind: 'mas', text: 'Diste más de lo que traías. Cuidaste mucho el día: mañana protege tu descanso.' }
  if (gave(capacity, given)) return { kind: 'todo', text: capacity <= 40 ? `Traías ${capacity}% y lo diste. Eso vale tanto como un día de cien.` : 'Diste lo que traías. Duerme tranquilo.' }
  return { kind: 'parte', text: `Diste ${given}% de los ${capacity}% que traías. Sin culpa: mañana se mide con la medida de mañana.` }
}

export type DayMeasure = { day: string; capacity: number; given: number; gave: boolean }

/** Los últimos `n` días (el más viejo primero). Null donde no hay medida completa. */
export function measures(data: AppData, today: string, n = 14): { day: string; m: DayMeasure | null }[] {
  return Array.from({ length: n }, (_, i) => {
    const day = shift(today, i - (n - 1))
    const c = data.checkins.find(x => x.day === day)
    const m = c && c.capacity !== undefined && c.given !== undefined ? { day, capacity: c.capacity, given: c.given, gave: gave(c.capacity, c.given) } : null
    return { day, m }
  })
}

export type MeasureStats = { counted: number; gaveDays: number; avgCapacity: number | null; avgGiven: number | null; overGiving: boolean }

export function measureStats(list: { m: DayMeasure | null }[]): MeasureStats {
  const ms = list.flatMap(x => x.m ? [x.m] : [])
  const avg = (f: (m: DayMeasure) => number) => ms.length ? Math.round(ms.reduce((s, m) => s + f(m), 0) / ms.length) : null
  const last = ms.slice(-5)
  return {
    counted: ms.length, gaveDays: ms.filter(m => m.gave).length, avgCapacity: avg(m => m.capacity), avgGiven: avg(m => m.given),
    // Cinco registros seguidos dando bastante más de lo que traías: aviso de cuidado, no de felicitación.
    overGiving: last.length === 5 && last.every(m => m.given > m.capacity + 10),
  }
}

// ── Comparadores: cuánto es DE VERDAD traer el 100% (con tus propios días) ─────────────

export type Output = { readMin: number; focusMin: number; sets: number; habits: number; tasks: number }
export type Band = 'bajo' | 'medio' | 'alto'
export const BAND_LABEL: Record<Band, string> = { bajo: 'Con 40% o menos', medio: 'Con 45 a 75%', alto: 'Con 80% o más' }
export function bandOf(capacity: number): Band { return capacity <= 40 ? 'bajo' : capacity < 80 ? 'medio' : 'alto' }

/** Lo que de verdad hiciste ese día, con tus registros. */
export function outputOf(data: AppData, day: string): Output {
  return {
    readMin: Math.round(data.reading.filter(r => r.day === day && !r.estimated).reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60),
    focusMin: Math.round(data.focus.filter(f => f.day === day).reduce((s, f) => s + f.minutes, 0)),
    sets: data.sets.filter(s => s.day === day).length,
    habits: (data.habits[day] ?? []).length,
    tasks: data.tasks.filter(t => t.status === 'done' && t.completedOn === day).length,
  }
}

export type BandRow = { band: Band; label: string; days: number; avg: Output | null; sleep: number | null }
export type Comparison = { rows: BandRow[]; today: Output; todayBand: Band | null; enough: boolean; lines: string[] }

const MIN_DAYS = 2

/** Compara hoy contra tus días con capacidad parecida y contra tus días de 100%. Solo usa días ya medidos (con capacidad). */
export function compareDay(data: AppData, day: string, capacity: number | null): Comparison {
  const measured = data.checkins.filter(c => c.capacity !== undefined && c.day !== day)
  const rows: BandRow[] = (['bajo', 'medio', 'alto'] as Band[]).map(band => {
    const cs = measured.filter(c => bandOf(c.capacity!) === band)
    const outs = cs.map(c => outputOf(data, c.day))
    const mean = (f: (o: Output) => number) => Math.round(outs.reduce((s, o) => s + f(o), 0) / Math.max(1, outs.length))
    const sleeps = cs.flatMap(c => c.sleepHours === undefined ? [] : [c.sleepHours])
    return { band, label: BAND_LABEL[band], days: cs.length,
      avg: outs.length >= MIN_DAYS ? { readMin: mean(o => o.readMin), focusMin: mean(o => o.focusMin), sets: mean(o => o.sets), habits: mean(o => o.habits), tasks: mean(o => o.tasks) } : null,
      sleep: sleeps.length >= MIN_DAYS ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length * 10) / 10 : null }
  })
  const today = outputOf(data, day)
  const todayBand = capacity === null ? null : bandOf(capacity)
  const lines: string[] = []
  const mine = rows.find(r => r.band === todayBand)
  if (mine?.avg) {
    const a = mine.avg
    lines.push(`${mine.label.replace('Con', 'Cuando traes')} sueles leer ${a.readMin} min, enfocar ${a.focusMin} min y marcar ${plural(a.habits, 'hábito', 'hábitos')}. Hoy: ${today.readMin} min, ${today.focusMin} min y ${today.habits}.`)
  }
  const high = rows.find(r => r.band === 'alto')
  const row = data.checkins.find(c => c.day === day)
  if (high?.sleep !== null && high?.sleep !== undefined && row?.sleepHours !== undefined && todayBand === 'alto' && row.sleepHours < high.sleep - 1.5) {
    lines.push(`Tus días de 80% o más vienen con ${high.sleep} h de sueño en promedio. Anoche dormiste ${row.sleepHours} h: ¿de verdad traías tanto o fue ánimo?`)
  }
  if (high?.avg && rows.find(r => r.band === 'bajo')?.avg) {
    const low = rows.find(r => r.band === 'bajo')!.avg!
    const gap = (high.avg.readMin + high.avg.focusMin) - (low.readMin + low.focusMin)
    if (gap > 0) lines.push(`Entre un día bajo y uno alto, la diferencia real en tu caso es de unos ${gap} minutos de lectura y enfoque. Tu 100% no es el doble: es lo que tengas.`)
  }
  return { rows, today, todayBand, enough: rows.some(r => r.avg), lines }
}
