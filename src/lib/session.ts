/**
 * La sesión de hoy hecha a la medida de tu tiempo. Funciones puras.
 *
 * Por qué así (detalle y fuentes en science.ts):
 * - Lo que hace crecer el músculo es el volumen de la SEMANA, no cuántos días entrenas.
 *   Con poco tiempo, se protege ese volumen y se recorta lo que ya vas cubriendo (Iversen 2021).
 * - Las superseries de antagonistas (empuje con jalón, pierna con glúteo) cortan el tiempo
 *   casi a la mitad sin perder series: mientras uno trabaja, el otro descansa (Iversen 2021).
 * - Descansar más de 60 s da un poco más de músculo; pasar de 90 s ya no suma (Singer 2024).
 */
import type { AppData, Settings } from './model'
import { progression, type MuscleState, type PlanItem } from './coach'
import { exercise, type Exercise, type Slot } from './exercises'

export const PAIRS: [Slot, Slot][] = [
  ['empuje', 'jalon'], ['hombro', 'jalon_ancho'], ['cuello_flex', 'cuello_ext'],
  ['pierna', 'bisagra'], ['pantorrilla', 'core'], ['antebrazo_flex', 'agarre'], ['aductor', 'nordico'],
]
/** Ejercicios grandes, de varias articulaciones: piden más descanso. */
export const BIG: Slot[] = ['empuje', 'jalon', 'jalon_ancho', 'hombro', 'pierna', 'bisagra']
export const EXPRESS_REST = 45
export const EXPRESS_LIMIT = 20

/** Segundos de descanso después de una serie. En exprés el otro ejercicio del par es tu descanso. */
export function restFor(ex: Exercise, settings: Pick<Settings, 'restSeconds'>, express = false): number {
  if (express) return EXPRESS_REST
  return BIG.includes(ex.slot) ? settings.restSeconds : Math.min(60, settings.restSeconds)
}

/** Cuánto dura una serie: los segundos de la meta, o 3 s por repetición más 10 s de acomodarte. */
export function workSeconds(ex: Exercise, target: number): number {
  return ex.mode === 'seconds' ? target + 10 : target * 3 + 10
}

export function estimateMinutes(items: PlanItem[], settings: Pick<Settings, 'restSeconds'>, express = false): number {
  const total = items.reduce((sum, item) => {
    const target = item.progression.target[0] ?? item.exercise.range[0]
    const left = Math.max(0, item.sets - item.doneToday)
    return sum + left * (workSeconds(item.exercise, target) + restFor(item.exercise, settings, express))
  }, 0)
  return Math.ceil(total / 60)
}

/** Qué tanto le falta a un ejercicio esta semana: el músculo principal más atrasado manda. */
export function deficit(item: PlanItem, states: MuscleState[]): number {
  const main = Object.entries(item.exercise.muscles).filter(([, w]) => w === 1).map(([m]) => m)
  return Math.max(0, ...main.map(m => {
    const s = states.find(x => x.id === m)
    if (!s) return 0
    const gap = Math.max(0, s.target[0] - s.weekSets) / s.target[0]
    return gap + (s.status === 'pendiente' ? 0.5 : 0)
  }))
}

export type Group = PlanItem[]
/** Junta los ejercicios en pares de antagonistas cuando los dos están en el plan. */
export function groups(items: PlanItem[]): Group[] {
  const used = new Set<string>()
  const out: Group[] = []
  for (const item of items) {
    if (used.has(item.slot)) continue
    const pair = PAIRS.find(p => p.includes(item.slot))
    const mate = pair && items.find(i => i.slot !== item.slot && pair.includes(i.slot) && !used.has(i.slot))
    used.add(item.slot)
    if (mate) used.add(mate.slot)
    out.push(mate ? [item, mate] : [item])
  }
  return out
}

export type Fitted = { items: PlanItem[]; dropped: PlanItem[]; minutes: number; express: boolean; grouped: Group[] }

/**
 * Ajusta la sesión a los minutos que tienes. Sin límite (o con tiempo de sobra) va completa.
 * Con poco tiempo entra en modo exprés: superseries y, si aún no cabe, primero lo que más te falta.
 * Nunca deja la sesión vacía: el primer grupo siempre entra.
 */
export function fitToTime(items: PlanItem[], budget: number | null, settings: Pick<Settings, 'restSeconds'>, states: MuscleState[]): Fitted {
  const full = estimateMinutes(items, settings)
  if (budget === null || full <= budget) return { items, dropped: [], minutes: full, express: false, grouped: groups(items) }
  const express = budget <= EXPRESS_LIMIT
  // El par se mide por su promedio: con poco tiempo, mejor dos músculos atrasados que uno ya cubierto.
  const ranked = groups(items).map(g => ({ g, need: g.reduce((sum, i) => sum + deficit(i, states), 0) / g.length }))
    .sort((a, b) => b.need - a.need).map(x => x.g)
  const kept: Group[] = []
  for (const g of ranked) {
    if (kept.length && estimateMinutes([...kept.flat(), ...g], settings, express) > budget) continue
    kept.push(g)
  }
  const keep = new Set(kept.flat().map(i => i.slot))
  const order = items.filter(i => keep.has(i.slot))
  return { items: order, dropped: items.filter(i => !keep.has(i.slot)), minutes: estimateMinutes(order, settings, express), express, grouped: groups(order) }
}

export type Step = { item: PlanItem; set: number }
/** El orden de las series: en par se alternan (A1, B1, A2, B2); solo, seguidas. */
export function sessionQueue(grouped: Group[]): Step[] {
  return grouped.flatMap(g => {
    const max = Math.max(...g.map(i => i.sets))
    return Array.from({ length: max }, (_, k) => g.filter(i => k < i.sets).map(item => ({ item, set: k + 1 }))).flat()
  })
}

/** La siguiente serie que falta, con lo que ya registraste hoy. Sobrevive a recargar la app. */
export function currentStep(queue: Step[], data: AppData, today: string): { step: Step | null; done: number; total: number } {
  const count = (id: string) => data.sets.filter(s => s.day === today && s.exercise === id).length
  const step = queue.find(s => count(s.item.exercise.id) < s.set) ?? null
  const done = queue.filter(s => count(s.item.exercise.id) >= s.set).length
  return { step, done, total: queue.length }
}

/**
 * Un número que no cuadra con el ejercicio casi siempre es un dedazo (por ejemplo, anotar
 * kilos donde iban segundos). No bloquea: pide confirmar.
 */
export function checkValue(ex: Exercise, value: number): string | null {
  const [lo, hi] = ex.range
  if (ex.mode === 'seconds' && value < lo / 2) return `¿${value} segundos? Para ${ex.name.toLowerCase()} es muy poco. Si eran kilos, actívalo en "Con peso".`
  if (value > hi * 2.5) return `¿${value}${ex.mode === 'seconds' ? ' segundos' : ' repeticiones'}? Es mucho más que tu rango (${lo} a ${hi}). Si es cierto, toca subir de escalón.`
  return null
}

/** El día de fútbol que falta registrar: hoy desde las 6 de la tarde, o ayer si quedó pendiente. */
export function footballToAsk(data: AppData, now: Date, asked: (day: string) => boolean, dateKeyOf: (d: Date) => string): string | null {
  const today = dateKeyOf(now)
  const y = new Date(now); y.setDate(y.getDate() - 1)
  const yesterday = dateKeyOf(y)
  const logged = (day: string) => data.activities.some(a => a.day === day && (a.kind === 'football' || a.kind === 'rest'))
  const isFootball = (d: Date) => data.settings.footballDays.includes(d.getDay())
  if (isFootball(now) && now.getHours() >= 18 && !logged(today) && !asked(today)) return today
  if (isFootball(y) && !logged(yesterday) && !asked(yesterday)) return yesterday
  return null
}

/**
 * Cambios del día: si hoy no tienes la mesa o algo molesta, otro ejercicio del MISMO hueco.
 * Un id desconocido o de otro movimiento se ignora: el volumen de la semana no se descuadra.
 */
export function applySwaps(items: PlanItem[], swaps: Partial<Record<string, string>>, data: AppData, today: string): PlanItem[] {
  return items.map(i => {
    const alt = swaps[i.slot] ? exercise(swaps[i.slot]!) : undefined
    if (!alt || alt.slot !== i.slot || alt.id === i.exercise.id) return i
    return { ...i, exercise: alt, progression: progression(data, alt, i.sets, today), doneToday: data.sets.filter(s => s.day === today && s.exercise === alt.id).length }
  })
}
