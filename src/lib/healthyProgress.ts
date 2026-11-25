import { dateKey, type AppData } from './model'
import { realReading, shiftDay, streak } from './progress'
import { votesOn } from './identity'

export function healthyProgress(data: AppData, today = dateKey()) {
  const start = shiftDay(today, -6)
  const strength = new Set([
    ...data.sets.filter(s => (s.reps ?? s.seconds ?? 0) > 0).map(s => s.day),
    ...data.training.filter(t => t.kind === 'strength' && t.sets > 0).map(t => t.day),
  ].filter(day => day >= start && day <= today))
  return {
    strengthDays: strength.size,
    reading: streak(data.reading.filter(realReading).map(r => r.day), today),
    votes: votesOn(data, today).total,
  }
}
