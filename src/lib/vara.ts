/**
 * La vara: cuánto diste del día sale de hechos, no de cómo te sientes en la noche.
 *
 * Por qué: el ánimo del momento cambia cómo recuerdas el día (memoria congruente con el
 * ánimo, y la brecha entre lo que viviste y lo que recuerdas). Cansado en la noche, un buen
 * día se recuerda flojo. Por eso:
 * 1. En la mañana, con tu capacidad, prometes de 1 a 3 cosas concretas. Más capacidad, más promesas.
 * 2. En la noche, tus registros dicen cuáles cumpliste. Nadie tiene que acordarse.
 * 3. Tres preguntas de conducta (sí o no) miden lo que los registros no ven.
 * 4. Tu sensación se anota aparte y se compara con los hechos. Gana el hecho.
 */
import { activeHabits, modulesOf, type AppData, type Checkin } from './model'
import { plural } from './text'

export type PromiseKind = 'reading' | 'training' | 'focus' | 'task' | 'habit' | 'free'
export type DayPromise = { id: string; kind: PromiseKind; label: string; target?: number; ref?: string; done?: boolean }
export type Anchors = { start?: boolean; escape?: boolean; people?: boolean }

export const ANCHOR_QUESTIONS: { id: keyof Anchors; text: string; hint: string }[] = [
  { id: 'start', text: 'Cuando tocó lo difícil, ¿lo empezaste sin darle vueltas?', hint: 'Cinco minutos de negociar contigo cuentan como no.' },
  { id: 'escape', text: '¿Tus pausas fueron descanso de verdad y no escape?', hint: 'Escape: celular, scroll o videos para no hacer lo que tocaba.' },
  { id: 'people', text: '¿Trataste bien a alguien aunque te costara?', hint: 'En casa, en la escuela o en el trabajo. Dar también es servir.' },
]

/** Más capacidad, más promesas. Con poco, una sola bien cumplida vale el día. */
export function promiseCount(capacity: number): number {
  return capacity <= 40 ? 1 : capacity < 80 ? 2 : 3
}

const minutesFor = (capacity: number, low: number, mid: number, high: number) => capacity <= 40 ? low : capacity < 80 ? mid : high

/** Sugerencias de promesa con tus módulos, tus tareas y tus hábitos. Las primeras son las de más palanca. */
export function suggestPromises(data: AppData, capacity: number): DayPromise[] {
  const m = modulesOf(data.settings)
  const out: DayPromise[] = []
  const tasks = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
  if (m.focus && tasks[0]) out.push({ id: `task:${tasks[0].id}`, kind: 'task', label: `Terminar: ${tasks[0].text}`, ref: tasks[0].id })
  if (m.reading) { const t = minutesFor(capacity, 5, 15, 25); out.push({ id: 'reading', kind: 'reading', label: `Leer ${t} min`, target: t }) }
  if (m.training) { const t = minutesFor(capacity, 4, 8, 12); out.push({ id: 'training', kind: 'training', label: `Entrenar: ${plural(t, 'serie', 'series')}`, target: t }) }
  if (m.focus) { const t = minutesFor(capacity, 25, 45, 90); out.push({ id: 'focus', kind: 'focus', label: `Enfocarme ${t} min`, target: t }) }
  if (m.focus && tasks[1]) out.push({ id: `task:${tasks[1].id}`, kind: 'task', label: `Terminar: ${tasks[1].text}`, ref: tasks[1].id })
  activeHabits(data.settings).filter(h => !h.auto).slice(0, 3)
    .forEach(h => out.push({ id: `habit:${h.id}`, kind: 'habit', label: h.label, ref: h.id }))
  return out
}

/** ¿Se cumplió? Lo dicen tus registros del día; solo las promesas libres se marcan a mano. */
export function promiseKept(p: DayPromise, data: AppData, day: string): boolean {
  if (p.kind === 'reading') return data.reading.filter(r => r.day === day && !r.estimated).reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60 >= (p.target ?? 1)
  if (p.kind === 'training') return data.sets.filter(s => s.day === day).length >= (p.target ?? 1)
  if (p.kind === 'focus') return data.focus.filter(f => f.day === day).reduce((s, f) => s + f.minutes, 0) >= (p.target ?? 1)
  if (p.kind === 'task') return data.tasks.some(t => t.id === p.ref && t.status === 'done' && t.completedOn === day)
  if (p.kind === 'habit') return (data.habits[day] ?? []).includes(p.ref ?? '')
  return p.done === true
}

export type Vara = { kept: number; total: number; yes: number; answered: number; score: number | null; given: number | null }

/**
 * La puntuación del día: 70% promesas cumplidas y 30% preguntas de conducta. Sin promesas,
 * solo las preguntas. Lo que diste = tu capacidad por esa puntuación.
 */
export function varaOf(row: Pick<Checkin, 'capacity' | 'promises' | 'anchors'> | undefined, data: AppData, day: string): Vara {
  const promises = row?.promises ?? []
  const kept = promises.filter(p => promiseKept(p, data, day)).length
  const answers = ANCHOR_QUESTIONS.map(q => row?.anchors?.[q.id]).filter((a): a is boolean => a !== undefined)
  const yes = answers.filter(Boolean).length
  const anchorScore = answers.length ? yes / answers.length : null
  const promiseScore = promises.length ? kept / promises.length : null
  const score = promiseScore !== null && anchorScore !== null ? 0.7 * promiseScore + 0.3 * anchorScore : promiseScore ?? anchorScore
  const given = score !== null && row?.capacity !== undefined ? Math.round(row.capacity * score) : null
  return { kept, total: promises.length, yes, answered: answers.length, score, given }
}

/** Tu cabeza contra los hechos. Solo habla si se separan 15 puntos o más. */
export function gutCheck(felt: number | undefined, given: number | null, v: Pick<Vara, 'kept' | 'total'>): string | null {
  if (felt === undefined || given === null || Math.abs(felt - given) < 15) return null
  if (felt < given) return `Tu cabeza dice ${felt}%, los hechos dicen ${given}%.${v.total ? ` Cumpliste ${v.kept} de ${plural(v.total, 'promesa', 'promesas')}.` : ''} Hoy tu cerebro te está cobrando de más: créele a los hechos.`
  return `Te sientes en ${felt}%, pero los hechos dicen ${given}%.${v.total ? ` Cumpliste ${v.kept} de ${v.total}.` : ''} Mañana promete menos y cúmplelo todo.`
}

/** Las promesas de hoy que tus registros ya cumplen (ids). La app celebra cada una la primera vez que aparece. */
export function keptToday(data: AppData, day: string): string[] {
  const row = data.checkins.find(c => c.day === day)
  return (row?.promises ?? []).filter(p => promiseKept(p, data, day)).map(p => p.id)
}
