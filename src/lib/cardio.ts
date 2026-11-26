import { makeId, type Activity, type AppData, type Sport } from './model'

export const WALK_MIN = 30
export const WALK_KM = 2.5
export const SPORTS: { id: Sport; name: string }[] = [{ id: 'caminar', name: 'Caminar' }, { id: 'correr', name: 'Correr' }, { id: 'bici', name: 'Bici' }]

export function cardioOn(data: AppData, day: string): Activity[] {
  return data.activities.filter(a => a.day === day && !!a.sport)
}
export function walkMinutes(data: AppData, day: string): number {
  return cardioOn(data, day).filter(a => a.sport === 'caminar').reduce((m, a) => m + (a.minutes ?? 0), 0)
}
export function walkKm(data: AppData, day: string): number {
  return Math.round(cardioOn(data, day).filter(a => a.sport === 'caminar').reduce((m, a) => m + (a.km ?? 0), 0) * 100) / 100
}
export function walkProgress(data: AppData, day: string): number {
  return Math.min(1, Math.max(walkMinutes(data, day) / WALK_MIN, walkKm(data, day) / WALK_KM))
}
export function walkDone(data: AppData, day: string): boolean {
  return walkProgress(data, day) >= 1
}
export function walkLabel(data: AppData, day: string): string {
  const min = walkMinutes(data, day), km = walkKm(data, day)
  if (!min && !km) return ''
  return km / WALK_KM > min / WALK_MIN ? `${km} km` : `${min} min`
}

export function logCardio(data: AppData, day: string, sport: Sport, minutes?: number, km?: number): AppData {
  const row: Activity = { id: `cardio:${makeId()}`, day, kind: sport === 'caminar' ? 'walk' : 'other', sport, note: sport, ...(minutes && minutes > 0 ? { minutes: Math.max(1, Math.round(minutes)) } : {}), ...(km && km > 0 ? { km: Math.round(km * 100) / 100 } : {}) }
  return { ...data, activities: [...data.activities, row] }
}

export function removeWalkFromRoutine(data: AppData): AppData {
  const train = data.settings.train
  const next = train ? { ...train, week: train.week.map(rt => rt ? { ...rt, items: rt.items.filter(i => !/^caminar/i.test(i.name)) } : rt) } : undefined
  return { ...data, settings: { ...data.settings, train: next, walkDaily: true, cardioSetup: true } }
}

export type SportStats = { km: number; minutes: number; sessions: number; bestKm: number; bestMin: number }
export function cardioStats(data: AppData, from: string, to: string): Record<Sport, SportStats> {
  const out = Object.fromEntries(SPORTS.map(s => [s.id, { km: 0, minutes: 0, sessions: 0, bestKm: 0, bestMin: 0 }])) as Record<Sport, SportStats>
  for (const a of data.activities) {
    if (!a.sport) continue
    const s = out[a.sport]
    s.bestKm = Math.max(s.bestKm, a.km ?? 0)
    s.bestMin = Math.max(s.bestMin, a.minutes ?? 0)
    if (a.day < from || a.day > to) continue
    s.km = Math.round((s.km + (a.km ?? 0)) * 100) / 100
    s.minutes += a.minutes ?? 0
    s.sessions += 1
  }
  return out
}

export function cardioXpOn(data: AppData, day: string): number {
  const list = cardioOn(data, day)
  return (walkDone(data, day) ? 10 : 0) + (list.some(a => a.sport === 'correr') ? 10 : 0) + (list.some(a => a.sport === 'bici') ? 10 : 0)
}

export function cardioGhost(data: AppData, sport: Sport, by: 'minutes' | 'km', today: string): { value: number; day: string } | null {
  const prev = data.activities.filter(a => a.sport === sport && a.day < today && (a[by] ?? 0) > 0).sort((a, b) => b.day.localeCompare(a.day))
  if (!prev.length) return null
  const day = prev[0].day
  return { value: Math.round(prev.filter(a => a.day === day).reduce((m, a) => m + (a[by] ?? 0), 0) * 100) / 100, day }
}
