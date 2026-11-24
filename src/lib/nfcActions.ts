/**
 * Lo que hace una etiqueta NFC cuando NO hay sesión en el navegador.
 *
 * Por qué existe: en iPhone una etiqueta solo puede abrir Safari, nunca la app instalada, y
 * Safari tiene su propia sesión (en modo privado, ninguna). Así que la etiqueta lleva una llave
 * tuya y el servidor hace la acción directo en tu cuenta; la app instalada la ve al sincronizar.
 *
 * Analogía: el control de la cochera. No necesitas entrar a la casa para abrir el portón: el
 * control ya trae su código. Si lo pierdes, cambias el código (rotar la llave en Ajustes).
 *
 * Función pura: recibe tus datos y devuelve los datos nuevos y el mensaje. La usa la función
 * bambu-nfc (empaquetada en core.js) y las pruebas.
 */
import { activeHabits, makeId, type AppData } from './model'
import { finishReading, readingSeconds } from './readingSession'
import type { NfcAction } from './nfc'
import { verdict } from './measure'
import { pauseActivity, pauseApp, pauseStats } from './pause'

export type NfcResult = { next: AppData; title: string; text: string; open?: boolean }
/** iPhone a veces lee la etiqueta dos veces seguidas: lo de menos de 8 s se toma como el mismo toque. */
const SAME_TOUCH = 8000

export function nfcServerAction(data: AppData, action: NfcAction, now: number, day: string): NfcResult {
  if (action.tag === 'reading') {
    const s = data.activeReading
    if (s && s.endedAt) return { next: data, open: true, title: 'Tu lectura está detenida', text: 'Abre Bambú desde el ícono para completar los detalles de tu lectura.' }
    if (s) {
      if (now - s.startedAt < SAME_TOUCH) return { next: data, title: 'Tu lectura ya empezó', text: 'Vuelve a tocar la etiqueta cuando termines.' }
      const done = finishReading(s, now)
      const min = Math.max(1, Math.round(readingSeconds(done, now) / 60))
      return { next: { ...data, activeReading: done, reading: data.reading.some(r => r.id === done.id) ? data.reading : [...data.reading, { id: done.id, day: done.day, minutes: Math.floor(readingSeconds(done, now) / 60), seconds: readingSeconds(done, now), title: done.title || 'Lectura', note: done.note || '', captureMode: 'timer', source: 'bambu' }] }, open: true, title: `Lectura guardada: ${min} min`, text: 'Tu tiempo ya está registrado. Abre Bambú para añadir los capítulos y tu idea.' }
    }
    return { next: { ...data, activeReading: { id: `reading:${makeId()}`, day, startedAt: now, title: '', location: '' } },
      title: 'Lectura iniciada', text: 'El cronómetro ya corre. Toca otra vez la etiqueta al terminar.' }
  }
  if (action.tag === 'training') {
    const w = data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : null
    if (w && now - w.startedAt < SAME_TOUCH) return { next: data, title: 'Tu sesión ya empezó', text: 'Registra cada serie en Bambú. Toca otra vez la etiqueta al terminar.' }
    if (w) {
      const sets = data.sets.filter(s => s.day === day).length
      return { next: { ...data, activeWorkout: null }, title: `Sesión cerrada: ${sets} ${sets === 1 ? 'serie' : 'series'}`,
        text: `${Math.round((now - w.startedAt) / 60000)} min. Come proteína y duerme tus horas.` }
    }
    return { next: { ...data, activeWorkout: { startedAt: now } }, open: true, title: 'Sesión iniciada', text: 'Abre Bambú desde el ícono para ver el plan y registrar tus series.' }
  }
  if (action.tag === 'night') {
    const n = action.night
    if (!n) return { next: data, open: true, title: 'Tu reflexión de la noche', text: 'Ábrela desde el ícono de Bambú, en Más, Noche.' }
    const capacity = Math.max(0, Math.min(100, Math.round(n.capacity))), given = Math.max(0, Math.min(100, Math.round(n.given)))
    const row = data.checkins.find(c => c.day === day) ?? { id: day, day }
    const reflection = n.reflection?.trim().slice(0, 600) || undefined
    return { next: { ...data, checkins: [...data.checkins.filter(c => c.day !== day), { ...row, id: day, day, capacity, given, ...(reflection ? { reflection } : {}) }] },
      title: `Noche registrada: ${given}% de ${capacity}%`, text: verdict(capacity, given).text }
  }
  if (action.tag === 'pause') {
    const app = pauseApp(action.app), outcome = action.outcome
    if (!outcome) return { next: data, title: 'Pausa', text: `Antes de ${app.name}, respira.` }
    const next = { ...data, activities: [...data.activities, pauseActivity(day, app, outcome)] }
    const s = pauseStats(next, day)
    const tally = `Hoy: ${s.resisted} de ${s.total} ${s.total === 1 ? 'vez' : 'veces'} elegiste otra cosa.`
    return outcome.kind === 'resistida'
      ? { next, title: 'Elegiste tu vida real', text: `${tally} Tu yo de la noche te lo agradece.` }
      : { next, title: `Pase de ${outcome.minutes} min`, text: `${tally} Entra con intención y sal cuando acabes.` }
  }
  if (action.tag === 'habit') {
    const habit = activeHabits(data.settings).find(h => h.id === action.habit)
    if (!habit) return { next: data, title: 'Hábito no encontrado', text: 'Esa etiqueta apunta a un hábito que ya no existe. Grábala de nuevo desde Ajustes.' }
    if ((data.habits[day] ?? []).includes(habit.id)) return { next: data, title: `${habit.label}: ya estaba`, text: 'Ya lo habías marcado hoy.' }
    return { next: { ...data, habits: { ...data.habits, [day]: [...(data.habits[day] ?? []), habit.id] } }, title: `Hecho: ${habit.label}`, text: 'Marcado en tu día.' }
  }
  const what = action.tag === 'focus' ? 'preparar tu bloque' : action.tag === 'checkin' ? 'tu check-in de la mañana' : 'registrar tu peso'
  return { next: data, open: true, title: 'Abre Bambú desde el ícono', text: `Para ${what} necesitas la app.` }
}
