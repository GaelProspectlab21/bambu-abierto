/**
 * El reporte de la semana: tú contra tu semana pasada, nunca contra nadie más.
 * Lunes a domingo. Solo cuenta lo registrado; lo estimado no suma minutos de lectura.
 */
import type { AppData } from './model'
import { promiseKept } from './vara'
import { gave } from './measure'
import { mondayOf, shift } from './coach'
import { plural } from './text'

export type WeekNumbers = {
  start: string; readMin: number; readDays: number; sets: number; trainDays: number; focusMin: number
  measured: number; gaveDays: number; promised: number; kept: number; habits: number
}

export function weekNumbers(data: AppData, start: string): WeekNumbers {
  const days = Array.from({ length: 7 }, (_, i) => shift(start, i))
  const inWeek = (d: string) => days.includes(d)
  const reading = data.reading.filter(r => inWeek(r.day) && !r.estimated)
  const sets = data.sets.filter(s => inWeek(s.day))
  const checks = data.checkins.filter(c => inWeek(c.day))
  const measured = checks.filter(c => c.capacity !== undefined && c.given !== undefined)
  const promised = checks.flatMap(c => (c.promises ?? []).map(p => ({ p, day: c.day })))
  return {
    start,
    readMin: Math.round(reading.reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60),
    readDays: new Set(reading.map(r => r.day)).size,
    sets: sets.length,
    trainDays: new Set(sets.map(s => s.day)).size,
    focusMin: Math.round(data.focus.filter(f => inWeek(f.day)).reduce((s, f) => s + f.minutes, 0)),
    measured: measured.length,
    gaveDays: measured.filter(c => gave(c.capacity!, c.given!)).length,
    promised: promised.length,
    kept: promised.filter(({ p, day }) => promiseKept(p, data, day)).length,
    habits: days.reduce((s, d) => s + (data.habits[d] ?? []).length, 0),
  }
}

export type WeekReport = { now: WeekNumbers; before: WeekNumbers; empty: boolean; wins: string[]; watch: string | null }

/**
 * La semana que cierra hoy (domingo) o la que acaba de cerrar (lunes). Dice lo que mejoró
 * con números, y UNA sola cosa a vigilar. Nunca regaña por lo que no registraste.
 */
export function weekReport(data: AppData, today: string): WeekReport {
  const monday = mondayOf(today)
  const start = today === monday ? shift(monday, -7) : monday
  const now = weekNumbers(data, start)
  const before = weekNumbers(data, shift(start, -7))
  const empty = now.readMin + now.sets + now.focusMin + now.measured + now.habits === 0
  const wins: string[] = []
  const up = (a: number, b: number) => a > b && a > 0
  if (up(now.readMin, before.readMin)) wins.push(`Leíste ${now.readMin} min, ${now.readMin - before.readMin} más que la semana pasada.`)
  if (up(now.sets, before.sets)) wins.push(`${plural(now.sets, 'serie', 'series')} de entreno, ${now.sets - before.sets} más.`)
  if (up(now.focusMin, before.focusMin)) wins.push(`${Math.round(now.focusMin / 6) / 10} h de enfoque, ${Math.round((now.focusMin - before.focusMin) / 6) / 10} h más.`)
  if (now.promised && now.kept === now.promised) wins.push(`Cumpliste las ${plural(now.promised, 'promesa', 'promesas')} que hiciste.`)
  else if (up(now.gaveDays, before.gaveDays)) wins.push(`${now.gaveDays} ${now.gaveDays === 1 ? 'día' : 'días'} diste lo que traías, más que la semana pasada.`)
  if (!wins.length && !empty) wins.push(now.readDays >= 5 ? `Leíste ${now.readDays} de 7 días. La constancia está ahí.` : 'Semana registrada. Eso ya es más de lo que hace casi todo el mundo.')
  let watch: string | null = null
  if (now.promised >= 3 && now.kept / now.promised < 0.5) watch = `Cumpliste ${now.kept} de ${plural(now.promised, 'promesa', 'promesas')}. La semana que viene promete menos, no más.`
  else if (before.sets >= 8 && now.sets < before.sets / 2) watch = `El entreno bajó de ${before.sets} a ${plural(now.sets, 'serie', 'series')}. Con 15 minutos en modo exprés alcanza.`
  else if (before.readDays >= 5 && now.readDays < 4) watch = `Leíste ${plural(now.readDays, 'día', 'días')}. Cinco minutos cuentan: no lo dejes caer.`
  return { now, before, empty, wins: wins.slice(0, 3), watch }
}
