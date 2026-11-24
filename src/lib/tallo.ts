/**
 * Tallo, el entrenador musculoso de Entrenar. No inventa: reutiliza lo que decide el coach
 * (plan del día, recuperación, progresión, peso y sueño) y lo dice con su voz, con la cita
 * de Juanma cuando existe. La voz cambia, los datos no.
 */
import { dateKey, type AppData } from './model'
import { coachNotes, massPlan, todayPlan, weekSessions } from './coach'

export type TalloPose = 'coach' | 'flex' | 'rest' | 'cheer'
export type TalloLine = { text: string; source?: string; tone: 'alerta' | 'consejo' | 'logro' }
export type TalloSays = { pose: TalloPose; headline: string; lines: TalloLine[] }

const OPENERS = ['Mira nada más.', 'A ver, campeón.', 'Escucha, que esto te conviene.', 'Sin prisa, pero sin pausa.', 'Se nota que vienes con ganas.']

export function talloSays(data: AppData, now = Date.now()): TalloSays {
  const today = dateKey(new Date(now))
  const plan = todayPlan(data, now)
  const week = weekSessions(data, today)
  const mass = massPlan(data, today)
  const opener = OPENERS[Math.floor(now / 86400000) % OPENERS.length]
  const lines: TalloLine[] = []

  if (plan.kind === 'dolor') return { pose: 'rest', headline: 'Hoy no entrenas.', lines: [{ tone: 'alerta', text: plan.summary }] }

  const trainedToday = data.sets.some(s => s.day === today)
  let pose: TalloPose = 'coach'
  let headline = `${opener} ${plan.title}`
  if (plan.kind === 'descanso' || plan.kind === 'futbol') pose = 'rest'
  else if (trainedToday) { pose = 'cheer'; headline = 'Eso es. Hoy sí cumpliste.' }
  else if (plan.kind === 'torso' || plan.kind === 'pierna') pose = 'flex'

  lines.push({ tone: 'consejo', text: plan.summary })
  if (week.torso + week.pierna > 0) lines.push({ tone: 'logro', text: `Esta semana llevas ${week.torso} de torso y ${week.pierna} de pierna.` })
  coachNotes(data, now).forEach(n => { if (!lines.some(l => l.text === n.text)) lines.push(n) })
  if (mass.status === 'sin-datos' && !lines.some(l => /Pésate/.test(l.text))) lines.push({ tone: 'consejo', text: mass.message, source: 'J007' })
  return { pose, headline, lines: lines.slice(0, 4) }
}
