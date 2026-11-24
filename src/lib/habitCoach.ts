/**
 * Apretar tuercas: cada dos semanas Brote revisa cómo vas con tus hábitos y, solo si ya los
 * sostienes, te propone UNO nuevo, pequeño y pegado a algo que ya haces.
 *
 * Por qué así (Lally 2010): un hábito tarda en promedio 66 días en volverse automático (de 18 a
 * 254) y fallar un día no lo rompe, pero ser inconstante sí. Por eso nunca se suman dos a la vez y,
 * si vas flojo, Brote no agrega: te pide afianzar el que más te cuesta. El ancla ("después de...")
 * es una intención de implementación (Gollwitzer 1999): decir cuándo y dónde duplica lo que se cumple.
 */
import type { AppData, HabitDef } from './model'
import { activeHabits, dateKey, modulesOf } from './model'
import { shiftDay } from './nutrition'

export type HabitIdea = { id: string; label: string; mark: string; cue: string; why: string; needs?: 'food' | 'bible' | 'sleep' }

export const HABIT_IDEAS: HabitIdea[] = [
  { id: 'pantalla-dormir', label: 'Sin pantalla 30 min antes de dormir', mark: 'P', cue: 'Cuando te pongas la pijama, el celular se queda cargando lejos de la cama.', why: 'La luz y el scroll retrasan el sueño. A tu edad necesitas de 8 a 10 horas para crecer y rendir.', needs: 'sleep' },
  { id: 'misma-hora', label: 'Acostarme a la misma hora', mark: 'H', cue: 'Pon una alarma de "a dormir" 30 minutos antes de tu hora.', why: 'Dormir a horas regulares mejora el sueño tanto como dormir más.', needs: 'sleep' },
  { id: 'proteina-desayuno', label: 'Proteína en el desayuno', mark: 'D', cue: 'Al servirte el desayuno, primero el huevo, la leche o el yogur.', why: 'Repartir la proteína en el día construye más músculo que juntarla en la cena.', needs: 'food' },
  { id: 'verdura-comida', label: 'Verdura en la comida', mark: 'V', cue: 'Al servirte, la mitad del plato con verdura o ensalada.', why: 'La OMS pide 400 g de frutas y verduras al día. Así llegas sin pensarlo.', needs: 'food' },
  { id: 'agua-despertar', label: 'Vaso de agua al despertar', mark: 'A', cue: 'Deja un vaso junto a la cama y tómalo antes de ver el celular.', why: 'Amaneces deshidratado. Es la victoria más fácil del día y arranca la racha.' },
  { id: 'ofrecer-dia', label: 'Ofrecer el día a Dios al despertar', mark: 'F', cue: 'Al poner los pies en el piso, una frase: "Este día es tuyo".', why: 'Empezar con la intención correcta cambia cómo vives lo demás.', needs: 'bible' },
  { id: 'sol-manana', label: 'Diez minutos de sol en la mañana', mark: 'L', cue: 'Después de desayunar, sal al patio o camina a la escuela sin lentes oscuros.', why: 'La luz de la mañana ajusta tu reloj interno: te da sueño más temprano en la noche.' },
  { id: 'caminar-comida', label: 'Caminar 10 min después de comer', mark: 'W', cue: 'Al levantarte de la mesa, una vuelta a la cuadra.', why: 'Caminar después de comer baja el pico de azúcar y ayuda a digerir.' },
  { id: 'mochila-lista', label: 'Dejar lista la mochila en la noche', mark: 'M', cue: 'Después de cenar, mochila y ropa del día siguiente listas.', why: 'Cada decisión que quitas de la mañana es energía para lo importante.' },
  { id: 'examen', label: 'Examen de conciencia de 2 minutos', mark: 'X', cue: 'Ya acostado: ¿dónde estuvo Dios hoy?, ¿qué haría distinto?', why: 'San Ignacio lo pedía diario. Es la reflexión más corta que existe y la más honesta.', needs: 'bible' },
  { id: 'gratitud', label: 'Escribir tres gratitudes', mark: 'G', cue: 'Antes de dormir, tres cosas concretas del día.', why: 'Escribir gratitudes mejora el ánimo y el sueño en semanas (Emmons y McCullough 2003).' },
  { id: 'respirar', label: 'Dos minutos de respiración antes de estudiar', mark: 'R', cue: 'Al sentarte a estudiar, inhala 4, exhala 6, diez veces.', why: 'Exhalar más largo baja el estrés y te mete al enfoque más rápido.' },
]

export const SUGGEST_EVERY_DAYS = 14
const MAX_HABITS = 8

export type HabitAdvice =
  | { kind: 'add'; idea: HabitIdea; adherence: number }
  | { kind: 'tighten'; weakest: HabitDef; adherence: number }

const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Qué tanto cumpliste tus hábitos en los últimos 14 días (0 a 1) y cuál te cuesta más. */
export function habitAdherence(data: AppData, done: (h: HabitDef, day: string) => boolean, today: string): { rate: number; weakest: HabitDef | null } {
  const habits = activeHabits(data.settings)
  if (!habits.length) return { rate: 0, weakest: null }
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, -i))
  const per = habits.map(h => ({ h, n: days.filter(d => done(h, d)).length }))
  const rate = per.reduce((a, x) => a + x.n, 0) / (habits.length * days.length)
  return { rate, weakest: [...per].sort((a, b) => a.n - b.n)[0].h }
}

/** Primer día con cualquier registro: sin dos semanas de historia no hay con qué juzgar. */
function firstDay(data: AppData): string | null {
  const days = [...Object.keys(data.habits), ...data.reading.map(r => r.day), ...data.checkins.map(c => c.day), ...data.meals.map(m => m.day)]
  return days.length ? days.sort()[0] : null
}

export function habitAdvice(data: AppData, done: (h: HabitDef, day: string) => boolean, now = Date.now()): HabitAdvice | null {
  const today = dateKey(new Date(now))
  const state = data.settings.habitSuggest ?? {}
  const since = state.lastDay ?? firstDay(data)
  if (!since || since > shiftDay(today, -SUGGEST_EVERY_DAYS)) return null
  const { rate, weakest } = habitAdherence(data, done, today)
  const habits = activeHabits(data.settings)
  if (habits.length && rate < 0.5) return weakest ? { kind: 'tighten', weakest, adherence: rate } : null
  if (rate < 0.75 || habits.length >= MAX_HABITS) return null
  const mods = modulesOf(data.settings)
  const sleep = data.checkins.filter(c => c.day > shiftDay(today, -14) && c.sleepHours !== undefined).map(c => c.sleepHours!)
  const shortSleep = sleep.length >= 4 && sleep.reduce((a, b) => a + b, 0) / sleep.length < data.settings.sleepTarget - 0.5
  const have = new Set(data.settings.habits.flatMap(h => [h.id, plain(h.label)]))
  const skipped = new Set(state.skipped ?? [])
  const fits = (i: HabitIdea) => !have.has(i.id) && !have.has(plain(i.label)) && !skipped.has(i.id)
    && (i.needs !== 'food' || mods.food) && (i.needs !== 'bible' || mods.bible) && (i.needs !== 'sleep' || shortSleep)
  // Si duermes poco, el sueño va primero; lo demás en el orden del catálogo.
  const idea = HABIT_IDEAS.find(i => fits(i) && i.needs === 'sleep') ?? HABIT_IDEAS.find(i => fits(i) && i.needs !== 'sleep')
  return idea ? { kind: 'add', idea, adherence: rate } : null
}

/** Aceptar: el hábito entra a tu lista y el reloj de dos semanas vuelve a cero. */
export function acceptIdea(data: AppData, idea: HabitIdea, now = Date.now()): AppData {
  const today = dateKey(new Date(now))
  const habit: HabitDef = { id: idea.id, label: idea.label, mark: idea.mark }
  return { ...data, settings: { ...data.settings, habits: [...data.settings.habits.filter(h => h.id !== idea.id), habit], habitSuggest: { ...data.settings.habitSuggest, lastDay: today } } }
}
/** Ahora no: no lo vuelve a proponer y espera otras dos semanas. */
export function skipIdea(data: AppData, id: string | null, now = Date.now()): AppData {
  const today = dateKey(new Date(now))
  const s = data.settings.habitSuggest ?? {}
  return { ...data, settings: { ...data.settings, habitSuggest: { lastDay: today, skipped: id ? [...new Set([...(s.skipped ?? []), id])].slice(-60) : s.skipped } } }
}
