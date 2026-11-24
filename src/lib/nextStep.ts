/**
 * "Lo que sigue": la UNA cosa que conviene hacer ahora, según la hora y lo que ya hiciste.
 *
 * Analogía: el copiloto que no te lee todo el mapa, solo te dice la siguiente vuelta.
 * El orden importa: lo que se pierde si no se hace ahora va primero (guardar una lectura
 * detenida, el check-in de la mañana); lo demás sigue la lógica del día.
 */
import { activeHabits, cleanReminders, dateKey, modulesOf, type AppData } from './model'
import { realReading, streak } from './progress'
import { todayPlan } from './coach'
import { bedtime, minutesOf } from './reminders'
import { counts } from './focusStats'
import { plural } from './text'
import { SLOT_LABEL } from './nutrition'

/** Ventanas en las que el héroe pide registrar la comida que ya pasó (minutos del día). */
const MEAL_WINDOWS: { slot: 'desayuno' | 'comida' | 'cena'; from: number; to: number }[] = [
  { slot: 'desayuno', from: 8 * 60, to: 11 * 60 }, { slot: 'comida', from: 14 * 60 + 30, to: 17 * 60 }, { slot: 'cena', from: 19 * 60 + 30, to: 21 * 60 + 30 },
]

export type StepGo = 'Lectura' | 'Entrenar' | 'Comida' | 'Enfoque' | 'Hoy' | 'Hábitos' | 'Noche'
export type Step = { id: string; eyebrow: string; title: string; text: string; go?: StepGo; cta?: string; done?: boolean }

export function nextStep(data: AppData, now = Date.now()): Step {
  const d = new Date(now)
  const today = dateKey(d)
  const minute = d.getHours() * 60 + d.getMinutes()
  const r = cleanReminders(data.settings.reminders)
  const bed = minutesOf(bedtime(r, data.settings.sleepTarget))
  const wake = minutesOf(r.wake)
  const s = data.activeReading
  const mod = modulesOf(data.settings)
  if (s?.endedAt) return { id: 'save-reading', eyebrow: 'TE FALTA UN PASO', title: 'Guarda tu lectura', text: 'La detuviste y no la has guardado: marca tus capítulos y la idea que te llevas.', go: 'Lectura', cta: 'Guardar lectura' }
  const row = data.checkins.find(c => c.day === today)
  if (!row && minute >= wake && minute < 12 * 60) return { id: 'checkin', eyebrow: 'PARA ARRANCAR', title: '¿Con cuánto amaneciste?', text: 'Un toque: tu medida de hoy. Esa es la vara con la que te mides en la noche, no la de ayer ni la de nadie.', go: 'Hoy', cta: 'Marcar mi medida' }
  // Sin el módulo de lectura no se espera lectura: cuenta como hecha para no estorbar.
  const read = !mod.reading || data.reading.some(x => x.day === today && realReading(x))
  // De noche: la reflexión de 5 minutos es lo único que falta para cerrar bien el día.
  if (row?.given === undefined && read && minute >= 20 * 60 + 30 || row?.given === undefined && minute >= 21 * 60 + 15 && minute < 24 * 60) return { id: 'reflect', eyebrow: 'REFLEXIÓN DE LA NOCHE', title: '¿Diste lo que traías hoy?', text: 'Cinco minutos para medir tu día contra tu propia medida y cerrar en paz.', go: 'Noche', cta: 'Hacer mi reflexión' }
  // De noche: desde una hora antes de dormir hasta que te levantas (cruza la medianoche).
  const late = minute >= bed - 60 || minute < wake
  const rs = streak(data.reading.filter(realReading).map(x => x.day), today)
  const readStep: Step = { id: 'read', eyebrow: 'LECTURA', title: rs.current ? `Llevas ${plural(rs.current, 'día', 'días')} leyendo` : 'Lee 5 minutos', text: rs.current ? 'Cinco minutos cuentan. No la rompas hoy.' : 'Cinco minutos y arrancas racha nueva.', go: 'Lectura', cta: 'Empezar a leer' }
  if (late) {
    if (!read) return readStep
    const past = minute >= bed || minute < wake
    return { id: 'sleep', eyebrow: 'CIERRE DEL DÍA', title: past ? 'Ya es hora de dormir' : `A la cama a las ${bedtime(r, data.settings.sleepTarget)}`,
      text: past ? `Tu hora era ${bedtime(r, data.settings.sleepTarget)}. Lo que quede, mañana: el músculo crece mientras duermes.` : `Mañana te levantas a las ${r.wake}. Dormir ${data.settings.sleepTarget} horas es donde crece el músculo.`, done: true }
  }
  const plan = todayPlan(data, now)
  const trained = data.sets.some(x => x.day === today)
  if (mod.training && (plan.kind === 'torso' || plan.kind === 'pierna') && !trained && minute >= 14 * 60) return { id: 'train', eyebrow: 'ENTRENAMIENTO', title: plan.title, text: 'Dos series por ejercicio. Al terminar, proteína y a dormir tus horas.', go: 'Entrenar', cta: 'Abrir el plan' }
  // Comida: justo después de la hora de comer, un toque para no olvidarla (lo de siempre se repite en un toque).
  // Solo a quien ya adoptó Comida: al que no registra comidas no se le estorba con eso.
  const meal = mod.food && data.meals.length ? MEAL_WINDOWS.find(w => minute >= w.from && minute < w.to && !data.meals.some(m => m.day === today && m.slot === w.slot)) : undefined
  if (meal) return { id: 'meal', eyebrow: 'COMIDA', title: `¿Qué fue tu ${SLOT_LABEL[meal.slot].toLowerCase()}?`, text: 'Lo de siempre se registra en un toque.', go: 'Comida', cta: 'Registrar' }
  if (!read) return readStep
  if (mod.focus && !data.focus.some(f => f.day === today && counts(f))) {
    const next = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (b.level ?? 0) - (a.level ?? 0))[0]
    return { id: 'focus', eyebrow: 'ENFOQUE', title: next ? next.text : 'Un bloque que mueva la aguja', text: next ? `${next.minutes} min. Una sola cosa, celular lejos.` : 'Elige la tarea que más dinero o avance te da hoy.', go: 'Enfoque', cta: 'Preparar bloque' }
  }
  if (mod.training && (plan.kind === 'torso' || plan.kind === 'pierna') && !trained) return { id: 'train', eyebrow: 'ENTRENAMIENTO', title: plan.title, text: 'Dos series por ejercicio. Al terminar, proteína y a dormir tus horas.', go: 'Entrenar', cta: 'Abrir el plan' }
  const habits = activeHabits(data.settings)
  const marked = new Set(data.habits[today] ?? [])
  const left = habits.filter(h => !h.auto && !marked.has(h.id))
  if (left.length) return { id: 'habits', eyebrow: 'RITUALES', title: `Te ${left.length === 1 ? 'falta un hábito' : `faltan ${plural(left.length, 'hábito', 'hábitos')}`}`, text: left.slice(0, 3).map(h => h.label).join(', ') + '.', go: 'Hábitos', cta: 'Marcar hábitos' }
  return { id: 'done', eyebrow: 'DÍA RESUELTO', title: 'Hiciste lo importante', text: `Descansa. A la cama a las ${bedtime(r, data.settings.sleepTarget)}.`, done: true }
}
