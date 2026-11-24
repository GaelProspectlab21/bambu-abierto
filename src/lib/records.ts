/**
 * El espacio de Bambú como registros sueltos.
 *
 * La app trabaja con un objeto grande (AppData) porque es cómodo para pintar pantallas.
 * La nube guarda cada lectura, serie o tarea como su propia fila. Este módulo traduce
 * entre las dos formas:
 *  - diffRecords: qué registros cambiaron entre dos versiones del objeto (por referencia,
 *    así que cuesta casi nada aunque haya miles de filas).
 *  - applyRecords: mete en el objeto lo que llegó de la nube.
 *  - toRecords: el objeto completo como filas (para la primera subida y los respaldos).
 */
import {
  cleanActiveFocus, cleanActiveWorkout, cleanActivityRow, cleanBibleRow, cleanBodyRow, cleanCheckinRow, cleanExerciseRow,
  cleanFocusRow, cleanMealRow, cleanReadingRow, cleanSetRow, cleanSettings, cleanWorkRow, isDay, isRecord, type AppData,
} from './model'
import { cleanActiveReading } from './readingSession'
import { normalizeTasks } from './personal'

export type Collection = 'reading' | 'focus' | 'task' | 'bible' | 'work' | 'set' | 'activity' | 'checkin' | 'body' | 'exercise' | 'meal' | 'habit' | 'meta'
export type RecordRow = { collection: Collection; id: string; payload: Record<string, unknown>; deleted: boolean; clientUpdatedAt: number }

type ArrayKey = 'reading' | 'focus' | 'tasks' | 'bible' | 'works' | 'sets' | 'activities' | 'checkins' | 'body' | 'exercises' | 'meals'
const ARRAYS: { key: ArrayKey; collection: Collection; clean: (v: Record<string, unknown>) => { id: string } | null }[] = [
  { key: 'reading', collection: 'reading', clean: cleanReadingRow },
  { key: 'focus', collection: 'focus', clean: cleanFocusRow },
  { key: 'tasks', collection: 'task', clean: v => normalizeTasks([v])[0] ?? null },
  { key: 'bible', collection: 'bible', clean: cleanBibleRow },
  { key: 'works', collection: 'work', clean: cleanWorkRow },
  { key: 'sets', collection: 'set', clean: cleanSetRow },
  { key: 'activities', collection: 'activity', clean: cleanActivityRow },
  { key: 'checkins', collection: 'checkin', clean: cleanCheckinRow },
  { key: 'body', collection: 'body', clean: cleanBodyRow },
  { key: 'exercises', collection: 'exercise', clean: cleanExerciseRow },
  { key: 'meals', collection: 'meal', clean: cleanMealRow },
]
type MetaKey = 'profile' | 'settings' | 'activeFocus' | 'activeReading' | 'activeWorkout'
const META: MetaKey[] = ['profile', 'settings', 'activeFocus', 'activeReading', 'activeWorkout']

export function recordKey(collection: string, id: string): string {
  return `${collection}/${id}`
}

/** Los registros que cambiaron de `prev` a `next`, con la hora del cambio. */
export function diffRecords(prev: AppData, next: AppData, now = Date.now()): RecordRow[] {
  const out: RecordRow[] = []
  for (const { key, collection } of ARRAYS) {
    const before = prev[key] as { id: string }[]
    const after = next[key] as { id: string }[]
    if (before === after) continue
    const old = new Map(before.map(row => [row.id, row]))
    const seen = new Set<string>()
    for (const row of after) {
      seen.add(row.id)
      if (old.get(row.id) !== row) out.push({ collection, id: row.id, payload: row as Record<string, unknown>, deleted: false, clientUpdatedAt: now })
    }
    for (const id of old.keys()) if (!seen.has(id)) out.push({ collection, id, payload: {}, deleted: true, clientUpdatedAt: now })
  }
  if (prev.habits !== next.habits) {
    const days = new Set([...Object.keys(prev.habits), ...Object.keys(next.habits)])
    for (const day of days) {
      if (prev.habits[day] === next.habits[day]) continue
      const ids = next.habits[day]
      out.push({ collection: 'habit', id: day, payload: { day, ids: ids ?? [] }, deleted: !ids, clientUpdatedAt: now })
    }
  }
  for (const key of META) {
    if (prev[key] !== next[key]) out.push({ collection: 'meta', id: key, payload: { value: next[key] ?? null }, deleted: false, clientUpdatedAt: now })
  }
  return out
}

/** El objeto completo como filas. */
export function toRecords(data: AppData, now = Date.now()): RecordRow[] {
  const empty: AppData = { ...data, habits: {}, profile: data.profile, settings: data.settings }
  ARRAYS.forEach(({ key }) => { (empty as Record<ArrayKey, unknown[]>)[key] = [] })
  const rows = diffRecords(empty, data, now).filter(row => !row.deleted && row.collection !== 'meta')
  return [...rows, ...META.map(key => ({ collection: 'meta' as const, id: key, payload: { value: data[key] ?? null }, deleted: false, clientUpdatedAt: now }))]
}

/** Aplica filas que llegaron de la nube. Devuelve el mismo objeto si nada cambió. */
export function applyRecords(data: AppData, rows: RecordRow[]): AppData {
  if (!rows.length) return data
  let next = data
  const byCollection = new Map<Collection, RecordRow[]>()
  rows.forEach(row => byCollection.set(row.collection, [...(byCollection.get(row.collection) ?? []), row]))
  for (const { key, collection, clean } of ARRAYS) {
    const incoming = byCollection.get(collection)
    if (!incoming?.length) continue
    const map = new Map((next[key] as { id: string }[]).map(row => [row.id, row]))
    let changed = false
    for (const row of incoming) {
      if (row.deleted) { changed = map.delete(row.id) || changed; continue }
      const value = clean({ ...row.payload, id: row.id })
      if (value) { map.set(value.id, value); changed = true }
      else console.warn(`Bambú ignoró un registro inválido: ${collection}/${row.id}`)
    }
    if (changed) next = { ...next, [key]: [...map.values()] }
  }
  const habitRows = byCollection.get('habit')
  if (habitRows?.length) {
    const habits = { ...next.habits }
    for (const row of habitRows) {
      if (!isDay(row.id)) continue
      const ids = row.payload.ids
      if (row.deleted || !Array.isArray(ids)) delete habits[row.id]
      else habits[row.id] = [...new Set(ids.filter((id): id is string => typeof id === 'string'))].slice(0, 30)
    }
    next = { ...next, habits }
  }
  for (const row of byCollection.get('meta') ?? []) {
    const value = row.payload.value
    if (row.id === 'profile' && isRecord(value)) next = { ...next, profile: { name: String(value.name ?? '').slice(0, 40), onboardingComplete: value.onboardingComplete === true, north: typeof value.north === 'string' && value.north.trim() ? value.north.trim().slice(0, 140) : undefined } }
    if (row.id === 'settings') next = { ...next, settings: cleanSettings(value) }
    if (row.id === 'activeFocus') next = { ...next, activeFocus: cleanActiveFocus(value) }
    if (row.id === 'activeReading') next = { ...next, activeReading: cleanActiveReading(value) }
    if (row.id === 'activeWorkout') next = { ...next, activeWorkout: cleanActiveWorkout(value) }
  }
  return next
}
