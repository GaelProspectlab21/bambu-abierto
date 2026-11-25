import { dateKey, type AppData } from './model'
import { parseOutcome, pauseStats } from './pause'
import { shiftDay } from './progress'

export function pauseHistory(data: AppData, today = dateKey()) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = shiftDay(today, i - 13)
    const stats = pauseStats(data, day)
    const passMinutes = data.activities.filter(a => a.day === day && a.kind === 'other').reduce((total, a) => {
      const match = /^Pausa: [a-z]+ · pase (\d+) min$/.exec(a.note ?? '')
      const outcome = match ? parseOutcome(`p${match[1]}`) : undefined
      return total + (outcome?.kind === 'pase' ? outcome.minutes : 0)
    }, 0)
    return { day, ...stats, passMinutes }
  })
  const best = days.reduce<(typeof days)[number] | null>((best, day) => day.resisted > 0 && day.resisted >= (best?.resisted ?? 0) ? day : best, null)
  return { days, best, total: days.reduce((n,d) => n + d.total, 0), resisted: days.reduce((n,d) => n + d.resisted, 0), passMinutes: days.reduce((n,d) => n + d.passMinutes, 0) }
}
