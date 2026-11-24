export type ActiveReading = {
  id: string; day: string; startedAt: number; title: string; location: string
  pausedAt?: number; pausedMilliseconds?: number; endedAt?: number
  takeaway?: string; application?: string; note?: string
}
export type ReadingDetail = {
  seconds?: number; location?: string; takeaway?: string; application?: string
  captureMode?: 'timer' | 'manual'
}
const text = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : ''
export function readingDetail(v: Record<string, unknown>): ReadingDetail {
  return {
    ...(Number.isInteger(v.seconds) && Number(v.seconds) > 0 && Number(v.seconds) <= 86400 ? { seconds: Number(v.seconds) } : {}),
    ...(text(v.location, 100) ? { location: text(v.location, 100) } : {}),
    ...(text(v.takeaway, 2000) ? { takeaway: text(v.takeaway, 2000) } : {}),
    ...(text(v.application, 1000) ? { application: text(v.application, 1000) } : {}),
    ...(v.captureMode === 'timer' || v.captureMode === 'manual' ? { captureMode: v.captureMode } : {}),
  }
}
export function cleanActiveReading(v: unknown): ActiveReading | null {
  if (!v || typeof v !== 'object') return null
  const row = v as Record<string, unknown>
  if (!text(row.id, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.day)) || !Number.isFinite(row.startedAt) || Number(row.startedAt) <= 0) return null
  return {
    id: text(row.id, 80), day: String(row.day), startedAt: Number(row.startedAt),
    title: text(row.title, 300), location: text(row.location, 100),
    takeaway: text(row.takeaway, 2000), application: text(row.application, 1000), note: text(row.note, 500),
    ...Object.fromEntries(['pausedAt', 'pausedMilliseconds', 'endedAt'].filter(k => Number.isFinite(row[k]) && Number(row[k]) >= 0).map(k => [k, Number(row[k])])),
  }
}
export function readingSeconds(session: ActiveReading, now = Date.now()): number {
  const end = session.endedAt ?? session.pausedAt ?? now
  return Math.max(0, Math.floor((end - session.startedAt - (session.pausedMilliseconds ?? 0)) / 1000))
}
export function pauseReading(session: ActiveReading, now = Date.now()): ActiveReading {
  if (session.endedAt) return session
  return session.pausedAt ? { ...session, pausedAt: undefined, pausedMilliseconds: (session.pausedMilliseconds ?? 0) + now - session.pausedAt } : { ...session, pausedAt: now }
}
export function finishReading(session: ActiveReading, now = Date.now()): ActiveReading {
  return session.endedAt ? session : { ...session, endedAt: session.pausedAt ?? now }
}
