import type { AppData } from './model'

type ListKey = 'reading' | 'bible' | 'works' | 'focus' | 'tasks' | 'sets' | 'activities' | 'checkins' | 'body' | 'exercises' | 'meals'
const LISTS: ListKey[] = ['reading', 'bible', 'works', 'focus', 'tasks', 'sets', 'activities', 'checkins', 'body', 'exercises', 'meals']

export function resumenLocal(local: AppData): { series: number; dias: number; lecturas: number; total: number } {
  const series = local.sets.length
  const dias = Object.values(local.habits).filter(ids => ids.length > 0).length
  const lecturas = local.reading.length
  return { series, dias, lecturas, total: series + dias + lecturas + local.activities.length + local.tasks.length }
}

export function faltantes(cuenta: AppData, local: AppData): number {
  let n = 0
  for (const key of LISTS) {
    const ids = new Set((cuenta[key] as { id: string }[]).map(x => x.id))
    n += (local[key] as { id: string }[]).filter(x => !ids.has(x.id)).length
  }
  for (const [day, ids] of Object.entries(local.habits)) n += ids.filter(id => !(cuenta.habits[day] ?? []).includes(id)).length
  return n
}

export function fusionar(cuenta: AppData, local: AppData, now = Date.now()): AppData {
  const out: AppData = { ...cuenta }
  for (const key of LISTS) {
    const mine = cuenta[key] as { id: string }[]
    const ids = new Set(mine.map(x => x.id))
    const extra = (local[key] as { id: string }[]).filter(x => !ids.has(x.id))
    if (extra.length) (out as unknown as Record<ListKey, unknown[]>)[key] = [...mine, ...extra]
  }
  const habits = { ...cuenta.habits }
  for (const [day, ids] of Object.entries(local.habits)) {
    const merged = [...new Set([...(habits[day] ?? []), ...ids])]
    if (merged.length !== (habits[day] ?? []).length) habits[day] = merged
  }
  out.habits = habits
  if (local.profile.onboardingComplete) out.profile = { ...local.profile, onboardingComplete: true }
  out.settings = { ...local.settings, tablas: cuenta.settings.tablas ?? local.settings.tablas, amigos: cuenta.settings.amigos ?? local.settings.amigos, aprobados: cuenta.settings.aprobados ?? local.settings.aprobados }
  out.savedAt = now
  return out
}
