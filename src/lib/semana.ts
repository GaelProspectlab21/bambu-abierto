import type { AppData } from './model'
import { conCamaraSet, mondayOf, records } from './libre'
import { ganados, gastados } from './minutos'
import { xpOn } from './xp'
import { gardenStats, shiftDay } from './jardin'

export type Semana = {
  desde: string
  hasta: string
  reps: number
  segundos: number
  dias: number
  series: number
  top: { name: string; valor: number; seg: boolean }[]
  nuevos: { name: string; best: number; antes: number; seg: boolean }[]
  ganados: number
  usados: number
  xp: number
  racha: number
}

export function resumenSemana(data: AppData, today: string): Semana {
  const desde = mondayOf(today)
  const dias: string[] = []
  for (let d = desde; d <= today && dias.length < 7; d = shiftDay(d, 1)) dias.push(d)
  const sets = data.sets.filter(s => s.day >= desde && s.day <= today && conCamaraSet(s))
  const por = new Map<string, { valor: number; seg: boolean }>()
  let reps = 0, segundos = 0
  for (const s of sets) {
    const seg = s.seconds !== undefined
    const v = seg ? s.seconds ?? 0 : s.reps ?? 0
    if (seg) segundos += v; else reps += v
    const p = por.get(s.exercise) ?? { valor: 0, seg }
    p.valor += v
    por.set(s.exercise, p)
  }
  const top = [...por.entries()].map(([name, p]) => ({ name, ...p })).sort((a, b) => Number(a.seg) - Number(b.seg) || b.valor - a.valor).slice(0, 3)
  const antes = records(data, desde, true)
  const nuevos = [...records(data, undefined, true).values()]
    .filter(r => r.bestDay >= desde && r.bestDay <= today && r.best > (antes.get(r.name)?.best ?? 0))
    .map(r => ({ name: r.name, best: r.best, antes: antes.get(r.name)?.best ?? 0, seg: r.kind === 'seconds' }))
    .sort((a, b) => (b.best - b.antes) / Math.max(1, b.antes) - (a.best - a.antes) / Math.max(1, a.antes))
    .slice(0, 3)
  return {
    desde, hasta: today, reps, segundos,
    dias: new Set(sets.map(s => s.day)).size,
    series: sets.length,
    top, nuevos,
    ganados: dias.reduce((m, d) => m + ganados(data, d), 0),
    usados: dias.reduce((m, d) => m + gastados(data, d), 0),
    xp: dias.reduce((m, d) => m + xpOn(data, d), 0),
    racha: gardenStats(data, today).current,
  }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function rangoTexto(desde: string, hasta: string): string {
  const [, m1, d1] = desde.split('-').map(Number), [, m2, d2] = hasta.split('-').map(Number)
  return m1 === m2 ? (d1 === d2 ? `${d1} ${MESES[m1 - 1]}` : `${d1} al ${d2} ${MESES[m1 - 1]}`) : `${d1} ${MESES[m1 - 1]} al ${d2} ${MESES[m2 - 1]}`
}
export function tiempoTexto(seg: number): string {
  return seg < 60 ? `${seg} s` : `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}
