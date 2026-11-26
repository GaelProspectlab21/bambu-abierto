import { makeId, type AppData, type TrainingSet } from './model'

export const DUNGEON_TAG = 'mazmorra:'
export const DUNGEON_XP = 40
export const ROOMS = 4
type Pick = [string, 'reps' | 'seconds', number]
const POOLS: Pick[][] = [
  [['Lagartijas', 'reps', 5], ['Fondos', 'reps', 5], ['Pike push ups', 'reps', 4], ['Lagartijas diamante', 'reps', 4], ['Lagartijas declinadas', 'reps', 5]],
  [['Dominadas', 'reps', 3], ['Dominadas australianas', 'reps', 6], ['Chin ups', 'reps', 3], ['Colgarse de la barra', 'seconds', 20]],
  [['Sentadillas', 'reps', 8], ['Desplantes', 'reps', 8], ['Sentadilla con salto', 'reps', 8], ['Wall sit', 'seconds', 30]],
  [['Plancha', 'seconds', 30], ['Hollow hold', 'seconds', 20], ['Plancha lateral', 'seconds', 20], ['Burpees', 'reps', 5], ['Jumping jacks', 'reps', 20]],
]

function seeded(text: string): () => number {
  let h = 1779033703
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 }
}
function parse(note: string): { day: string; room: number } | null {
  const [day, room] = note.slice(DUNGEON_TAG.length).split(':')
  return day && room !== undefined ? { day, room: Number(room) } : null
}
function roomsDone(data: AppData): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>()
  for (const s of data.sets) {
    if (!s.note?.startsWith(DUNGEON_TAG)) continue
    const p = parse(s.note)
    if (!p) continue
    out.set(p.day, (out.get(p.day) ?? new Set()).add(p.room))
  }
  return out
}
export function clearedDays(data: AppData): string[] {
  return [...roomsDone(data).entries()].filter(([, r]) => r.size >= ROOMS).map(([d]) => d).sort()
}

export type Room = { name: string; kind: 'reps' | 'seconds'; target: number; done: boolean }
export type Dungeon = { day: string; tier: number; rooms: Room[]; cleared: boolean; next: number }
export function dungeonOf(data: AppData, day: string): Dungeon {
  const cleared = clearedDays(data).filter(d => d < day).length
  const tier = Math.min(4, Math.floor(cleared / 5))
  const rnd = seeded(`bambu-${day}`)
  const done = roomsDone(data).get(day) ?? new Set<number>()
  const picks = POOLS.map(pool => pool[Math.floor(rnd() * pool.length)])
  const order = picks.map((_, k) => k)
  for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [order[k], order[r]] = [order[r], order[k]] }
  const rooms = order.map((pi, k) => {
    const [name, kind, base] = picks[pi]
    return { name, kind, target: kind === 'seconds' ? base + tier * 10 : Math.round(base * (1 + tier * 0.25)), done: done.has(k) }
  })
  return { day, tier, rooms, cleared: done.size >= ROOMS, next: rooms.findIndex(r => !r.done) }
}

export function clearRoom(data: AppData, day: string, room: number, name: string, kind: 'reps' | 'seconds', value: number, now = Date.now()): AppData {
  const set: TrainingSet = kind === 'seconds'
    ? { id: makeId(), day, at: now, exercise: name, seconds: Math.max(1, Math.round(value)), note: `${DUNGEON_TAG}${day}:${room}` }
    : { id: makeId(), day, at: now, exercise: name, reps: Math.max(1, Math.round(value)), note: `${DUNGEON_TAG}${day}:${room}` }
  return { ...data, sets: [...data.sets, set], activeWorkout: data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : { startedAt: now } }
}

export function dungeonXpOn(data: AppData, day: string): number {
  return (roomsDone(data).get(day)?.size ?? 0) >= ROOMS ? DUNGEON_XP : 0
}
