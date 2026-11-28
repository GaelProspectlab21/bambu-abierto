/**
 * El coach de entrenamiento. Funciones puras: reciben tus datos y la hora, devuelven qué
 * toca. Nada aquí adivina: cada recomendación sale de lo que registraste y de una regla
 * escrita (casi todas del método de Juanma, ver juanma.ts).
 */
import { dateKey, type AppData, type TrainingSet } from './model'
import { proteinMealsOn } from './nutrition'
import { exercise, ladder, MUSCLES, nextInLadder, prevInLadder, SHIELD_SLOTS, TEMPLATES, type Exercise, type Muscle, type Slot } from './exercises'

const HOUR = 3600_000
const DAY = 24 * HOUR

export function shift(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}
export function weekday(day: string): number { return new Date(`${day}T12:00:00`).getDay() }
export function mondayOf(day: string): string { return shift(day, -((weekday(day) + 6) % 7)) }

/** Una serie cuenta como dura si quedaron 3 o menos repeticiones en reserva (o no se anotó). */
export function isHard(set: TrainingSet): boolean { return set.rir === undefined || set.rir <= 3 }
export function setValue(set: TrainingSet): number { return set.reps ?? set.seconds ?? 0 }

export type MuscleState = {
  id: Muscle; label: string; group: string; status: 'listo' | 'recuperando' | 'pendiente'
  readyAt: number | null; lastAt: number | null; weekSets: number; target: [number, number]; reason: string
}

function footballEnd(day: string): number { return new Date(`${day}T20:00:00`).getTime() }

export function muscleStates(data: AppData, now = Date.now()): MuscleState[] {
  const today = dateKey(new Date(now))
  const weekStart = shift(today, -6)
  const since = shift(today, -10)
  const recent = data.sets.filter(s => s.day >= since && isHard(s))
  const sore = new Set(data.checkins.find(c => c.day === today)?.soreness ?? [])
  const football = data.activities.filter(a => a.kind === 'football' && a.day >= shift(today, -3) && a.day <= today)
  return MUSCLES.map(m => {
    let weekSets = 0
    let lastAt: number | null = null
    const perDay = new Map<string, { sets: number; failures: number; last: number }>()
    for (const set of recent) {
      const ex = exercise(set.exercise)
      const weight = ex?.muscles[m.id] ?? 0
      if (!weight) continue
      if (set.day >= weekStart) weekSets += weight
      if (weight === 1) {
        const entry = perDay.get(set.day) ?? { sets: 0, failures: 0, last: 0 }
        entry.sets++
        if (set.rir === 0) entry.failures++
        entry.last = Math.max(entry.last, set.at)
        perDay.set(set.day, entry)
        lastAt = Math.max(lastAt ?? 0, set.at)
      }
    }
    let readyAt: number | null = null
    let reason = 'Sin entrenar en los últimos días.'
    for (const [, entry] of perDay) {
      // Una sola serie (el blindaje del día de fútbol) casi no fatiga: no bloquea el músculo.
      if (entry.sets < 2) continue
      const extra = entry.sets >= 6 || entry.failures >= 3 ? 24 : 0
      const at = entry.last + (m.recoveryHours + extra) * HOUR
      if (!readyAt || at > readyAt) { readyAt = at; reason = extra ? 'Sesión fuerte: necesita un día más.' : 'Entrenado hace poco.' }
    }
    if (m.group === 'pierna') {
      for (const game of football) {
        const at = footballEnd(game.day) + 36 * HOUR
        if (!readyAt || at > readyAt) { readyAt = at; reason = 'El fútbol ya cargó tus piernas.' }
      }
    }
    if (sore.has(m.id)) {
      const at = new Date(`${shift(today, 1)}T08:00:00`).getTime()
      if (!readyAt || at > readyAt) { readyAt = at; reason = 'Reportaste agujetas hoy.' }
    }
    const recovering = readyAt !== null && readyAt > now
    const idle = !recovering && (lastAt === null || now - lastAt > 5 * DAY)
    return {
      id: m.id, label: m.label, group: m.group, target: m.weekly, weekSets: Math.round(weekSets * 10) / 10, lastAt, readyAt: recovering ? readyAt : null,
      status: recovering ? 'recuperando' : idle ? 'pendiente' : 'listo',
      reason: recovering ? reason : idle ? (lastAt ? 'Más de 5 días sin estímulo: es prioridad.' : 'Aún sin registros.') : 'Recuperado.',
    }
  })
}

export function readyLabel(at: number, now = Date.now()): string {
  const d = new Date(at)
  const today = dateKey(new Date(now))
  const day = dateKey(d)
  const part = d.getHours() < 12 ? 'en la mañana' : d.getHours() < 19 ? 'en la tarde' : 'en la noche'
  if (day === today) return `hoy ${part}`
  if (day === shift(today, 1)) return `mañana ${part}`
  return `el ${new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(d)} ${part}`
}

/** Las sesiones de un ejercicio, de la más nueva a la más vieja. */
export function sessionsOf(data: AppData, exerciseId: string): { day: string; sets: TrainingSet[] }[] {
  const byDay = new Map<string, TrainingSet[]>()
  data.sets.filter(s => s.exercise === exerciseId).forEach(s => byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]))
  return [...byDay.entries()].map(([day, sets]) => ({ day, sets: sets.sort((a, b) => a.at - b.at) })).sort((a, b) => b.day.localeCompare(a.day))
}

const DEFAULT_START: Record<Slot, string> = {
  empuje: 'pushup', hombro: 'pike', jalon: 'row-backpack', jalon_ancho: 'row-backpack-1arm', aduccion: 'floor-towel-pull', biceps: 'curl-backpack', cuello_flex: 'neck-curl', cuello_ext: 'neck-extension',
  pierna: 'squat', bisagra: 'glute-bridge', pantorrilla: 'calf-raise', core: 'plank', antebrazo_flex: 'wrist-curl', antebrazo_ext: 'wrist-extension', agarre: 'backpack-hold',
  aductor: 'copenhagen', nordico: 'nordic',
}

export function available(ex: Exercise, equipment: string[]): boolean {
  return ex.equipment.every(e => e === 'nada' || equipment.includes(e))
}

/** El escalón en el que estás en un patrón: el último que registraste, o el de arranque. */
export function currentForSlot(data: AppData, slot: Slot): Exercise {
  const options = ladder(slot)
  const ids = new Set(options.map(e => e.id))
  const last = [...data.sets].filter(s => ids.has(s.exercise)).sort((a, b) => b.at - a.at)[0]
  // v11.4: el escalón que elegiste (diagnóstico o "no me sale") gana si es más nuevo que tu última serie.
  const elegido = data.settings.escalones?.[slot]
  const ex = elegido && ids.has(elegido.id) ? exercise(elegido.id) : undefined
  if (ex && (!last || elegido!.at > last.at)) return ex
  if (last) return exercise(last.exercise) ?? options[0]
  // Sin historial: arranca en el escalón que va con tu nivel (bienvenida) y con tu equipo.
  const level = data.settings.trainingLevel
  if (level && LEVELED.includes(slot)) {
    const usable = options.filter(e => available(e, data.settings.equipment))
    if (usable.length) return usable[Math.round((level - 1) / 3 * (usable.length - 1))]
  }
  return exercise(DEFAULT_START[slot]) ?? options[0]
}
/** Patrones grandes donde el nivel de arranque cambia el ejercicio. Cuello, agarre y antebrazo arrancan siempre en lo más seguro. */
const LEVELED: Slot[] = ['empuje', 'hombro', 'pierna', 'bisagra', 'core', 'jalon']

export type Progression = { verdict: 'nuevo' | 'subir' | 'bajar' | 'progresando' | 'fatiga' | 'repetir'; message: string; target: number[]; last: number[]; next?: Exercise; prev?: Exercise }

/** Doble progresión: si todas tus series tocaron el tope del rango, sube; si no, una repetición más. */
export function progression(data: AppData, ex: Exercise, plannedSets = 2, today = dateKey()): Progression {
  // Las series de hoy no cuentan como "la vez pasada": la meta no se mueve a media sesión.
  const sessions = sessionsOf(data, ex.id).filter(s => s.day < today)
  const [lo, hi] = ex.range
  const unit = ex.mode === 'seconds' ? 's' : ''
  if (!sessions.length) {
    return { verdict: 'nuevo', last: [], target: Array(plannedSets).fill(lo),
      message: `Primera vez: busca ${lo} a ${hi}${unit} con buena técnica y anota cuántas salieron.` }
  }
  const last = sessions[0].sets.map(setValue)
  const prevTotal = sessions[1]?.sets.map(setValue).reduce((a, b) => a + b, 0)
  const lastTotal = last.reduce((a, b) => a + b, 0)
  const working = last.slice(0, plannedSets)
  const allTop = working.length >= Math.min(plannedSets, 2) && working.every(v => v >= hi)
  const loaded = sessions[0].sets.some(s => (s.loadKg ?? 0) > 0)
  if (allTop) {
    const next = nextInLadder(ex.id)
    return { verdict: 'subir', last, target: Array(plannedSets).fill(lo), next,
      message: next ? `Llegaste al tope (${hi}${unit}) en todas tus series. Sube a ${next.name} y vuelve a ${lo}.`
        : loaded ? `Tope alcanzado con peso. Súbele 1 o 2 kg a la mochila y vuelve a ${lo}.`
          : `Tope alcanzado. Métele peso con la mochila o libros y vuelve a ${lo}.` }
  }
  // v11.4: si la vez pasada ni la mitad del mínimo salió con técnica, el escalón es muy alto: baja uno.
  const prev = prevInLadder(ex.id, data.settings.equipment)
  if (prev && working.length && Math.max(...working) < Math.ceil(lo / 2)) {
    return { verdict: 'bajar', last, target: Array(plannedSets).fill(prev.range[0]), prev,
      message: `La vez pasada no llegaste ni a ${Math.ceil(lo / 2)}${unit}. Primero domina ${prev.name}: cuando hagas ${prev.range[1]}${prev.mode === 'seconds' ? 's' : ''} en tus series, regresas aquí más fuerte.` }
  }
  if (prevTotal && lastTotal < prevTotal * 0.8) {
    return { verdict: 'fatiga', last, target: last.slice(0, plannedSets),
      message: 'La última vez saliste 20% abajo de la anterior. Repite esa meta; revisa sueño y comida.' }
  }
  const target = Array.from({ length: plannedSets }, (_, i) => Math.min(hi, (working[i] ?? working[working.length - 1] ?? lo) + (ex.mode === 'seconds' ? 5 : 1)))
  return { verdict: 'progresando', last, target, message: `Última vez ${last.join(' · ')}${unit}. Hoy busca ${target.join(' · ')}${unit}.` }
}

export type PlanItem = { slot: Slot; exercise: Exercise; sets: number; progression: Progression; doneToday: number }
export type Reason = { text: string; source?: string }
export type TodayPlan = { kind: 'torso' | 'pierna' | 'descanso' | 'futbol' | 'dolor'; title: string; summary: string; reasons: Reason[]; items: PlanItem[]; urgent?: boolean }

function dayLoad(data: AppData, day: string): boolean {
  return data.sets.filter(s => s.day === day && isHard(s)).length >= 4 || data.activities.some(a => a.day === day && a.kind === 'football')
}
export function sessionKind(sets: TrainingSet[]): 'torso' | 'pierna' | null {
  const counts = { torso: 0, pierna: 0 }
  sets.forEach(s => {
    const slot = exercise(s.exercise)?.slot
    if (!slot) return
    if (TEMPLATES[0].slots.includes(slot)) counts.torso++
    if (TEMPLATES[1].slots.includes(slot)) counts.pierna++
  })
  if (!counts.torso && !counts.pierna) return null
  return counts.torso >= counts.pierna ? 'torso' : 'pierna'
}
export function weekSessions(data: AppData, today = dateKey()): { torso: number; pierna: number; football: number; days: string[] } {
  const start = mondayOf(today)
  const days = Array.from({ length: 7 }, (_, i) => shift(start, i))
  let torso = 0, pierna = 0
  days.forEach(day => {
    const kind = sessionKind(data.sets.filter(s => s.day === day))
    if (kind === 'torso') torso++
    if (kind === 'pierna') pierna++
  })
  const football = new Set(data.activities.filter(a => a.kind === 'football' && days.includes(a.day)).map(a => a.day)).size
  return { torso, pierna, football, days }
}

function itemsFor(data: AppData, template: 'torso' | 'pierna' | 'blindaje', today: string): PlanItem[] {
  const slots = template === 'blindaje' ? SHIELD_SLOTS : TEMPLATES.find(t => t.id === template)!.slots
  const sets = template === 'blindaje' ? 1 : 2
  return slots.map(slot => {
    let ex = currentForSlot(data, slot)
    if (!available(ex, data.settings.equipment)) ex = ladder(slot).filter(e => available(e, data.settings.equipment)).pop() ?? ex
    const n = template === 'blindaje' ? sets : ex.sets ?? sets
    return { slot, exercise: ex, sets: n, progression: progression(data, ex, n), doneToday: data.sets.filter(s => s.day === today && s.exercise === ex.id).length }
  })
}

export function todayPlan(data: AppData, now = Date.now()): TodayPlan {
  const today = dateKey(new Date(now))
  // Si anoche reportaste dolor de pecho en la reflexión y hoy aún no hay check-in, la precaución sigue vigente.
  const checkin = data.checkins.find(c => c.day === today) ?? (data.checkins.find(c => c.day === shift(today, -1))?.pain === 'pecho' ? data.checkins.find(c => c.day === shift(today, -1)) : undefined)
  if (checkin?.pain === 'pecho') {
    return { kind: 'dolor', urgent: true, title: 'Hoy no entrenes.', items: [],
      summary: 'Reportaste dolor en el pecho. Avísale hoy a tu mamá, papá o un adulto. Si te falta el aire, te mareas o el dolor es fuerte, es urgencia: pide ayuda ya.',
      reasons: [{ text: 'El dolor de pecho no es agujeta. Un adulto y un médico deciden cuándo vuelves.' }] }
  }
  const states = muscleStates(data, now)
  const ready = (group: string) => states.filter(s => s.group === group).every(s => s.status !== 'recuperando')
  const week = weekSessions(data, today)
  const footballToday = data.settings.footballDays.includes(weekday(today)) || data.activities.some(a => a.day === today && a.kind === 'football')
  const legTarget = data.settings.footballDays.length >= 3 ? 1 : 2
  const reasons: Reason[] = []
  const trainedToday = sessionKind(data.sets.filter(s => s.day === today))
  if (checkin?.pain) reasons.push({ text: `Reportaste dolor en ${checkin.pain}: salta cualquier ejercicio que lo provoque.` })
  if (trainedToday) {
    return { kind: trainedToday, title: trainedToday === 'torso' ? 'Hoy ya entrenaste torso.' : 'Hoy ya entrenaste pierna.', summary: 'Termina tus series pendientes o descansa. La recuperación también construye.', reasons, items: itemsFor(data, trainedToday, today) }
  }
  if (footballToday) {
    return { kind: 'futbol', title: 'Hoy toca fútbol.', items: itemsFor(data, 'blindaje', today),
      summary: 'El partido es tu sesión de pierna. En tu calentamiento, 5 minutos de blindaje: una serie de Copenhagen por lado y una de nórdico.',
      reasons: [...reasons, { text: `Tus piernas ya trabajan en el fútbol. Tu plan incluye ${legTarget === 1 ? 'una sesión' : 'dos sesiones'} de pierna a la semana.` },
        { text: 'El Copenhagen bajó 41% los problemas de ingle en futbolistas y el nórdico baja a la mitad las lesiones de isquio.', source: 'HAROY' }] }
  }
  const streak = [1, 2, 3, 4, 5].every(n => dayLoad(data, shift(today, -n)))
  if (streak) {
    return { kind: 'descanso', title: 'Hoy descansa.', items: [],
      summary: `Llevas cinco días seguidos con carga. Camina, estírate y cuida tu meta de ${data.settings.sleepTarget} horas de sueño: el músculo crece cuando descansas.`,
      reasons: [...reasons, { text: 'Juanma se recupera bien porque hace pocas series y duerme 9 horas.', source: 'J009' }] }
  }
  const torsoBehind = 3 - week.torso
  const legBehind = legTarget - week.pierna
  const nextFootball = [1, 2].some(n => data.settings.footballDays.includes(weekday(shift(today, n))))
  const canLegs = ready('pierna') && legBehind > 0 && !data.settings.footballDays.includes(weekday(shift(today, 1)))
  const canTorso = ready('torso') && torsoBehind > 0
  let kind: 'torso' | 'pierna' | null = null
  if (canLegs && (!canTorso || legBehind >= torsoBehind)) kind = 'pierna'
  else if (canTorso) kind = 'torso'
  else if (ready('torso') && torsoBehind <= 0 && legBehind <= 0) kind = null
  if (!kind) {
    const pending = states.filter(s => s.status === 'recuperando')
    return { kind: 'descanso', title: 'Hoy descanso activo.', items: [],
      summary: torsoBehind <= 0 && legBehind <= 0 ? 'Ya cumpliste las sesiones de la semana. Camina y estírate.' : `Tus músculos siguen recuperando${pending[0]?.readyAt ? `: ${pending[0].label.toLowerCase()} listo ${readyLabel(pending[0].readyAt, now)}` : ''}.`,
      reasons: [...reasons, { text: 'Entrenar un músculo que no se ha recuperado no lo hace crecer más rápido.' }] }
  }
  reasons.push({ text: kind === 'torso' ? `Llevas ${week.torso} de 3 sesiones de torso esta semana.` : `Llevas ${week.pierna} de ${legTarget} de pierna esta semana.`, source: 'J009' })
  if (kind === 'pierna' && nextFootball) reasons.push({ text: 'Hay fútbol pronto: haz las series limpias, sin llegar al fallo en pierna.' })
  if (kind === 'torso') reasons.push({ text: 'El cuello va con torso: dos series de 10 a 20 en flexión y extensión.', source: 'J004' })
  const title = kind === 'torso' ? 'Hoy toca torso.' : 'Hoy toca pierna y core.'
  return { kind, title, items: itemsFor(data, kind, today), reasons,
    summary: 'Dos series por ejercicio. La primera a 1 o 2 del fallo; la última hasta que la técnica se rompa.' }
}

export type MassPlan = {
  weight: number | null; weekAvg: number | null; prevAvg: number | null; monthPct: number | null
  proteinGrams: number | null; proteinPerMeal: number | null; mealsAvg: number | null; sleepAvg: number | null
  status: 'sin-datos' | 'lento' | 'bien' | 'rapido'; message: string; photosDue: boolean; lastPhotos: string | null
}

function avg(values: number[]): number | null { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null }

export function massPlan(data: AppData, today = dateKey()): MassPlan {
  const weights = data.body.filter(b => b.weightKg).sort((a, b) => a.day.localeCompare(b.day))
  const inRange = (from: number, to: number) => weights.filter(b => b.day > shift(today, -from) && b.day <= shift(today, -to)).map(b => b.weightKg!)
  const weekAvg = avg(inRange(7, 0))
  const prevAvg = avg(inRange(14, 7))
  const monthAgo = avg(inRange(35, 28))
  const weight = weights[weights.length - 1]?.weightKg ?? null
  const monthPct = weekAvg && monthAgo ? Math.round((weekAvg / monthAgo - 1) * 1000) / 10 : null
  const proteinGrams = weight ? Math.round(weight * 1.6) : null
  const last7 = data.checkins.filter(c => c.day > shift(today, -7))
  // Las comidas registradas en Comida mandan; si un día no hay, vale lo que dijiste en el check-in.
  const mealDays = [...new Set([...last7.map(c => c.day), ...data.meals.filter(m => m.day > shift(today, -7) && m.day <= today).map(m => m.day)])]
  const mealsAvg = avg(mealDays.flatMap(d => { const n = proteinMealsOn(data, d); return n === undefined ? [] : [n] }))
  const sleepAvg = avg(last7.flatMap(c => c.sleepHours === undefined ? [] : [c.sleepHours]))
  const lastPhotos = [...data.body].filter(b => b.photos).sort((a, b) => b.day.localeCompare(a.day))[0]?.day ?? null
  const photosDue = !lastPhotos || lastPhotos <= shift(today, -30)
  let status: MassPlan['status'] = 'sin-datos'
  let message = 'Pésate 3 a 5 mañanas por semana, en ayunas y después del baño. Con dos semanas de datos el coach te dice si vas bien.'
  if (monthPct !== null) {
    if (monthPct < 0.5) { status = 'lento'; message = 'Tu promedio casi no se mueve. Agrega una comida o un snack de comida real al día (plátano con crema de cacahuate, vaso de leche, huevos, frijoles con tortilla) y revisa en dos semanas.' }
    else if (monthPct > 2) { status = 'rapido'; message = 'Subes rápido. Quita primero ultraprocesados y bebidas dulces; la comida real se queda.' }
    else { status = 'bien'; message = 'Vas al ritmo de un volumen limpio. Sigue igual y entrena duro.' }
  } else if (weekAvg && prevAvg) {
    message = `Promedio de esta semana ${weekAvg.toFixed(1)} kg contra ${prevAvg.toFixed(1)} kg la anterior. Con un mes de datos ya hay tendencia.`
  }
  return { weight, weekAvg, prevAvg, monthPct, proteinGrams, proteinPerMeal: proteinGrams ? Math.round(proteinGrams / 4) : null, mealsAvg, sleepAvg, status, message, photosDue, lastPhotos }
}

export type CoachNote = { text: string; source?: string; tone: 'alerta' | 'consejo' | 'logro' }

/** Lo que el coach te diría hoy en la puerta del gimnasio. Máximo tres, lo más importante primero. */
export function coachNotes(data: AppData, now = Date.now()): CoachNote[] {
  const today = dateKey(new Date(now))
  const notes: CoachNote[] = []
  const mass = massPlan(data, today)
  if (mass.sleepAvg !== null && mass.sleepAvg < data.settings.sleepTarget - 0.5) notes.push({ tone: 'alerta', source: 'J023', text: `Vas en ${mass.sleepAvg.toFixed(1)} h de sueño en promedio. Tu meta es de ${data.settings.sleepTarget} horas. Acuéstate 30 minutos antes esta semana.` })
  if (mass.mealsAvg !== null && mass.mealsAvg < 3) notes.push({ tone: 'consejo', source: 'J010', text: `Promedias ${mass.mealsAvg.toFixed(1)} comidas con proteína al día. Apunta a 4: cada comida con huevo, carne, pollo, frijoles, leche o yogur.` })
  const up = TEMPLATES.flatMap(t => t.slots).map(slot => currentForSlot(data, slot)).map(ex => ({ ex, p: progression(data, ex) })).find(x => x.p.verdict === 'subir')
  if (up) notes.push({ tone: 'logro', source: 'J004', text: `${up.ex.name}: ${up.p.message}` })
  if (mass.photosDue && data.sets.length >= 6) notes.push({ tone: 'consejo', source: 'J001', text: 'Toca foto de progreso: frente, lado y espalda, mañana al levantarte y antes de desayunar. Guárdala en Progreso.' })
  if (mass.status === 'lento') notes.push({ tone: 'consejo', source: 'J048', text: mass.message })
  const neck = data.sets.filter(s => exercise(s.exercise)?.slot.startsWith('cuello')).sort((a, b) => b.at - a.at)[0]
  if (data.sets.length >= 6 && (!neck || now - neck.at > 8 * DAY)) notes.push({ tone: 'consejo', source: 'J004', text: 'Llevas más de una semana sin cuello. Es el músculo que nadie entrena: dos series al final del torso.' })
  return notes.slice(0, 3)
}

/** Récord de un ejercicio: la mejor serie (más repeticiones o segundos; con peso gana el peso). */
export function personalBest(data: AppData, exerciseId: string): TrainingSet | null {
  return data.sets.filter(s => s.exercise === exerciseId).sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || setValue(b) - setValue(a))[0] ?? null
}

export type WeightWeek = { end: string; avg: number | null; low: number | null; high: number | null }
const DAYS_PER_MONTH = 30.4
/**
 * Promedio semanal de peso (semanas que cierran hoy, hace 7 días...) con la franja del
 * volumen limpio: de +0.5% a +2% al mes desde la primera semana con datos.
 */
export function weightTrend(data: AppData, today = dateKey(), weeks = 12): WeightWeek[] {
  const rows = Array.from({ length: weeks }, (_, i) => {
    const end = shift(today, -7 * (weeks - 1 - i))
    return { end, avg: avg(data.body.filter(b => b.weightKg && b.day > shift(end, -7) && b.day <= end).map(b => b.weightKg!)) }
  })
  const first = rows.findIndex(r => r.avg !== null)
  return rows.map((r, i) => {
    if (first < 0 || i < first) return { ...r, low: null, high: null }
    const months = (i - first) * 7 / DAYS_PER_MONTH
    const base = rows[first].avg!
    return { ...r, low: base * (1 + 0.005 * months), high: base * (1 + 0.02 * months) }
  })
}

export type DayKind = 'torso' | 'pierna' | 'futbol' | 'descanso' | 'dolor'
export type WeekDay = { day: string; past: boolean; isToday: boolean; plan: DayKind | null; done: DayKind[] }
/**
 * La semana de lunes a domingo. Lo pasado dice lo que de verdad pasó; hoy, lo que dice el
 * coach; lo que viene es una proyección con las mismas reglas que todayPlan: fútbol en sus
 * días, 2 días entre sesiones del mismo grupo y nada de pierna la víspera del partido.
 * La proyección cambia en cuanto registras algo: es un mapa, no un contrato.
 */
export function weekPlan(data: AppData, now = Date.now()): WeekDay[] {
  const today = dateKey(new Date(now))
  const start = mondayOf(today)
  const football = (day: string) => data.settings.footballDays.includes(weekday(day)) || data.activities.some(a => a.day === day && a.kind === 'football')
  const doneOn = (day: string): DayKind[] => {
    const out: DayKind[] = []
    const kind = sessionKind(data.sets.filter(s => s.day === day))
    if (kind) out.push(kind)
    if (data.activities.some(a => a.day === day && a.kind === 'football')) out.push('futbol')
    if (!out.length && data.activities.some(a => a.day === day && a.kind === 'rest')) out.push('descanso')
    return out
  }
  const week = weekSessions(data, today)
  const legTarget = data.settings.footballDays.length >= 3 ? 1 : 2
  let torsoLeft = 3 - week.torso, legLeft = legTarget - week.pierna
  let lastTorso = '', lastLeg = ''
  for (let n = 1; n <= 3; n++) {
    const d = shift(today, -n), done = doneOn(d)
    if (!lastTorso && done.includes('torso')) lastTorso = d
    if (!lastLeg && (done.includes('pierna') || done.includes('futbol'))) lastLeg = d
  }
  const gap = (from: string, to: string) => from ? Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / DAY) : 99
  return Array.from({ length: 7 }, (_, i) => {
    const day = shift(start, i)
    const done = day <= today ? doneOn(day) : []
    if (day < today) return { day, past: true, isToday: false, plan: null, done }
    let plan: DayKind
    if (day === today) {
      const p = todayPlan(data, now)
      plan = p.kind
      if (done.includes('torso')) { lastTorso = day } else if (plan === 'torso') { torsoLeft--; lastTorso = day }
      if (done.includes('pierna') || plan === 'futbol') lastLeg = day
      else if (plan === 'pierna') { legLeft--; lastLeg = day }
    } else if (football(day)) { plan = 'futbol'; lastLeg = day }
    else {
      const legOk = legLeft > 0 && gap(lastLeg, day) >= 2 && !football(shift(day, 1))
      const torsoOk = torsoLeft > 0 && gap(lastTorso, day) >= 2
      if (legOk && (!torsoOk || legLeft >= torsoLeft)) { plan = 'pierna'; legLeft--; lastLeg = day }
      else if (torsoOk) { plan = 'torso'; torsoLeft--; lastTorso = day }
      else plan = 'descanso'
    }
    return { day, past: false, isToday: day === today, plan, done }
  })
}
