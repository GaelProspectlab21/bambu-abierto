/**
 * Las cuentas del enfoque, portadas de Cauce (lib/semana.ts y lib/stats.ts).
 * Semana de lunes a domingo en hora local. Solo cuentan bloques completados con duración conocida.
 */
import { dateKey, type AppData, type Focus } from './model'
import { mondayOf, shift } from './coach'
import { plural } from './text'

export type Light = 'verde' | 'ambar' | 'rojo'
export type Signal = { id: 'horas' | 'aguja' | 'constancia'; name: string; light: Light; detail: string; action: string }
export type Week = { start: string; minutes: number; blocks: number; days: number; highLeverage: number | null }
export type Verdict = { title: string; light: Light; signals: Signal[]; next: string | null }

export const PAUSE_REASONS = ['me pidieron algo en casa', 'comer, baño o agua', 'me llamaron', 'imprevisto', 'otra']
export const BLOCKER_TAGS = ['redes sociales', 'notificaciones', 'hambre o sed', 'cansancio', 'tarea mal definida', 'interrupción externa', 'ansiedad o sobrecarga', 'otra']
export const BINAURAL = [
  { id: 'lectura', label: 'Lectura y flow', hz: 10 },
  // v11.4: solo frecuencias que el motor de audio genera (6, 10 y 14 Hz). 16 y 40 tronaban con "Frecuencia no admitida".
  { id: 'analisis', label: 'Código y análisis', hz: 14 },
  { id: 'calma', label: 'Calma', hz: 6 },
]

export function counts(row: Focus): boolean {
  return row.minutes > 0 && row.durationKnown !== false && (!row.status || row.status === 'completed')
}
export function hm(minutes: number): string {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60)
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

export function summarize(focus: Focus[], start: string, end = shift(start, 7)): Week {
  const rows = focus.filter(r => counts(r) && r.day >= start && r.day < end)
  const minutes = rows.reduce((s, r) => s + r.minutes, 0)
  const leveled = rows.filter(r => r.level)
  const high = leveled.filter(r => (r.level ?? 0) >= 3).reduce((s, r) => s + r.minutes, 0)
  const leveledMinutes = leveled.reduce((s, r) => s + r.minutes, 0)
  return { start, minutes, blocks: rows.length, days: new Set(rows.map(r => r.day)).size, highLeverage: leveledMinutes ? Math.round(high / leveledMinutes * 100) : null }
}

export function weeks(data: AppData, n = 8, today = dateKey()): (Week & { current: boolean })[] {
  const monday = mondayOf(today)
  return Array.from({ length: n }, (_, i) => {
    const start = shift(monday, -7 * (n - 1 - i))
    return { ...summarize(data.focus, start), current: i === n - 1 }
  })
}

export function expectedByNow(goal: number, now = new Date()): number {
  const monday = new Date(`${mondayOf(dateKey(now))}T00:00:00`)
  return Math.round(goal * Math.min(1, (now.getTime() - monday.getTime()) / (7 * 86400000)))
}

/** Sin meta elegida no hay retraso ni una cuota heredada de otra persona. */
export function weekPace(minutes: number, goal: number, now = new Date()): string {
  if (goal <= 0) return 'Esta semana, a tu ritmo. Puedes elegir una meta en Ajustes.'
  const pace = minutes - expectedByNow(goal, now)
  return `Meta de ${hm(goal)} esta semana. ${hm(Math.abs(pace))} ${pace >= 0 ? 'adelante' : 'atrás'} del ritmo.`
}

export function verdict(week: Week, goal: number | null, reference: number | null, possibleDays = 7): Verdict {
  const target = goal || reference
  const pct = target ? Math.round(week.minutes / target * 100) : 0
  const hours: Signal = target
    ? { id: 'horas', name: 'Horas', light: pct >= 100 ? 'verde' : pct >= 80 ? 'ambar' : 'rojo', detail: `${hm(week.minutes)} de ${hm(target)}, ${pct}%.`,
      action: `Te faltaron ${hm(Math.max(0, target - week.minutes))}. Agenda el bloque antes de abrir el celular.` }
    : { id: 'horas', name: 'Horas', light: week.minutes ? 'ambar' : 'rojo', detail: `${hm(week.minutes)} sin meta para comparar.`, action: 'Ponte una meta semanal en Ajustes.' }
  const lev = week.highLeverage ?? 0
  const needle: Signal = { id: 'aguja', name: 'Aguja', light: lev >= 60 ? 'verde' : lev >= 40 ? 'ambar' : 'rojo', detail: week.highLeverage === null ? 'Sin nivel registrado.' : `${lev}% de tu tiempo fue nivel 3 o 4.`,
    action: 'Mucho tiempo en nivel 1 y 2. Arranca el día con tu tarea de nivel 4.' }
  const goalDays = Math.min(5, possibleDays)
  const steady: Signal = { id: 'constancia', name: 'Constancia', light: week.days >= goalDays ? 'verde' : week.days >= Math.ceil(goalDays * 0.6) ? 'ambar' : 'rojo',
    detail: `Enfoque ${week.days} de ${plural(possibleDays, 'día', 'días')}.`, action: 'Un bloque diario de 45 minutos vale más que dos maratones.' }
  const signals = [hours, needle, steady]
  if (!week.minutes) return { title: 'Semana sin bloques', light: 'rojo', signals, next: 'Cero bloques. Un bloque de 45 minutos hoy y arrancas.' }
  const weight = { verde: 2, ambar: 1, rojo: 0 }
  const points = signals.reduce((s, x) => s + weight[x.light], 0)
  const worst = [...signals].sort((a, b) => weight[a.light] - weight[b.light])[0]
  return { title: points >= 5 ? 'Buena semana' : points >= 3 ? 'Semana sólida' : 'Semana floja', light: points >= 5 ? 'verde' : points >= 3 ? 'ambar' : 'rojo', signals, next: worst.light === 'verde' ? null : worst.action }
}

export function byTimeOfDay(focus: Focus[]): { label: string; blocks: number; score: number | null }[] | null {
  const rows = focus.filter(r => counts(r) && r.startedAt)
  if (rows.length < 5) return null
  const bands = [{ label: 'Madrugada', from: 0, to: 7 }, { label: 'Mañana', from: 7, to: 12 }, { label: 'Tarde', from: 12, to: 19 }, { label: 'Noche', from: 19, to: 24 }]
  return bands.map(b => {
    const inBand = rows.filter(r => { const h = new Date(r.startedAt!).getHours(); return h >= b.from && h < b.to })
    const scored = inBand.filter(r => r.focusScore)
    return { label: b.label, blocks: inBand.length, score: scored.length ? Math.round(scored.reduce((s, r) => s + r.focusScore!, 0) / scored.length * 10) / 10 : null }
  })
}

export function topInterruptions(focus: Focus[], since: string): { label: string; count: number }[] {
  const tally = new Map<string, number>()
  focus.filter(r => r.day >= since).forEach(r => {
    r.blockers?.forEach(b => tally.set(b, (tally.get(b) ?? 0) + 1))
    r.pauses?.forEach(p => tally.set(`pausa: ${p.reason}`, (tally.get(`pausa: ${p.reason}`) ?? 0) + 1))
  })
  return [...tally.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5)
}

/** Minutos reales del bloque activo: reloj menos pausas. */
export function activeSeconds(a: { startedAt: number; pausedAt?: number; pausedMilliseconds?: number; endedAt?: number }, now = Date.now()): number {
  const end = a.endedAt ?? a.pausedAt ?? now
  return Math.max(0, Math.floor((end - a.startedAt - (a.pausedMilliseconds ?? 0)) / 1000))
}

export function lastImprovement(focus: Focus[]): string | null {
  return [...focus].filter(r => r.improvement).sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0) || b.day.localeCompare(a.day))[0]?.improvement ?? null
}
