/**
 * Brote, el compañero de Hoy: dice UNA cosa según lo que pasó y la hora, y debajo tiene
 * consejos que rotan al tocarlo. Todo sale de tus registros: nada de frases al azar ni culpa.
 */
import { cleanReminders, dateKey, modulesOf, type AppData } from './model'
import { realReading, streak } from './progress'
import { game } from './gamification'
import { bedtime, minutesOf } from './reminders'
import { plural } from './text'

/** `susto` y `sinSenal` solo salen en errores y sin conexión: nunca por tus datos. */
export type Mood = 'feliz' | 'orgulloso' | 'sueno' | 'animo' | 'calma' | 'susto' | 'sinSenal'
export type BroteSay = { mood: Mood; lines: string[]; source?: string }

/** Consejos cortos del método de Juanma (mente y sueño) y de la casa. Se eligen por día para que no cambien solos. */
const TIPS: { text: string; source?: string }[] = [
  { text: 'Lo difícil primero y el celular después. Si entrenar se siente imposible, es contraste de dopamina, no flojera.', source: 'J006' },
  { text: 'Un día malo no rompe el proceso. Mañana vuelves y ya.', source: 'J025' },
  { text: 'Termina el entreno fuerte 3 horas antes de dormir. Si se hizo tarde, algo suave.', source: 'J023' },
  { text: 'Elige a qué hora te levantas y resta tu meta de sueño. Esa es tu hora de cama.', source: 'J023' },
  { text: 'Cinco minutos de lectura cuentan como día leído. Empezar es lo difícil, no seguir.' },
  { text: 'Una marca vacía no dice que fallaste: dice que no hay registro.' },
  { text: 'Caminar suma sin quitarle recuperación al entreno. Sube de mil en mil pasos.', source: 'J026' },
  { text: 'Una cosa a la vez. Celular lejos, y a lo que sigue.' },
  { text: 'Registrar la serie de hoy es lo que te dice mañana si subiste.', source: 'J004' },
]

export function dayNumber(day: string): number { return Math.floor(new Date(`${day}T12:00:00`).getTime() / 86400000) }

export function broteSays(data: AppData, now = Date.now()): BroteSay {
  const d = new Date(now)
  const today = dateKey(d)
  const minute = d.getHours() * 60 + d.getMinutes()
  const r = cleanReminders(data.settings.reminders)
  const bed = minutesOf(bedtime(r, data.settings.sleepTarget))
  const wake = minutesOf(r.wake)
  const g = game(data, today)
  const rs = streak(data.reading.filter(realReading).map(x => x.day), today)
  const mod = modulesOf(data.settings)
  const read = !mod.reading || data.reading.some(x => x.day === today && realReading(x))
  const checkin = data.checkins.find(c => c.day === today)
  const start = dayNumber(today) % TIPS.length
  const tips = [0, 1, 2, 3].map(i => TIPS[(start + i) % TIPS.length])
  const say = (mood: Mood, first: string): BroteSay => ({ mood, lines: [first, ...tips.map(t => t.text)], source: tips[0].source })

  if (checkin?.pain === 'pecho') return say('calma', 'Hoy no se fuerza nada. Avísale a un adulto y descansa.')
  if (g.gave.today === true) return say('orgulloso', checkin?.capacity !== undefined && checkin.capacity <= 40 ? `Hoy traías ${checkin.capacity}% y lo diste. Eso pesa tanto como un día de cien. Duerme tranquilo.` : 'Diste lo que traías. Duerme tranquilo.')
  if (g.gave.today === false && checkin?.given !== undefined) return say('calma', `Diste ${checkin.given}% de ${checkin.capacity ?? '?'}%. Sin culpa: mañana se mide con la medida de mañana.`)
  if (g.dayComplete) return say('orgulloso', 'Día completo. Así se echa raíz.')
  const late = minute >= bed - 60 || minute < wake
  if (late) return say('sueno', read ? (mod.training ? 'Ya hiciste lo tuyo. A dormir, que el músculo crece de noche.' : 'Ya hiciste lo tuyo. A dormir tranquilo.') : 'Cinco minutos de lectura y a la cama. Sin drama.')
  if (!checkin && minute >= wake && minute < 12 * 60) return say('feliz', 'Buenos días. ¿Con cuánto amaneciste hoy? Esa es tu medida.')
  if (checkin?.capacity !== undefined && checkin.capacity <= 40 && minute < 17 * 60) return say('animo', `Hoy traes ${checkin.capacity}%. Da todo ese ${checkin.capacity}% y ya ganaste el día.`)
  if (mod.reading && !read && rs.current > 0 && minute >= 17 * 60) return say('animo', `Llevas ${plural(rs.current, 'día', 'días')} leyendo. Cinco minutos y la cuidas.`)
  if (g.week.good === g.week.goal - 1 && !g.week.days.find(x => x.day === today)?.good) return say('animo', 'Te falta un día sólido para el bono de la semana.')
  const left = g.quests.filter(q => !q.done)
  if (left.length && left.length < g.quests.length) return say('feliz', `Te ${left.length === 1 ? 'falta 1 misión' : `faltan ${left.length} misiones`}. La más cerca: ${left[0].label.toLowerCase()}.`)
  return say('feliz', 'Aquí estoy. Elige una cosa y empezamos.')
}
