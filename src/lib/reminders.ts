/**
 * Recordatorios: qué avisar y cuándo.
 *
 * Analogía: un despertador que antes de sonar se asoma a ver si ya estás despierto.
 * A la hora fijada revisa tus registros: si ya leíste, no suena el de lectura; si hoy
 * toca fútbol o descanso, no suena el de entrenar. Este archivo es lógica pura: lo usa la
 * app (para enseñarte el horario) y la función del servidor que manda el push (la misma
 * regla en los dos lados, así no se contradicen).
 *
 * `now` es la hora de pared: en el navegador es Date.now(); en el servidor, que vive en
 * UTC, se pasa la hora local convertida para que los getters locales den la hora de cada persona.
 */
import { cleanReminders, dateKey, modulesOf, type AppData, type Reminders } from './model'
export { cleanReminders, DEFAULT_REMINDERS, type Reminders } from './model'
import { realReading, streak } from './progress'
import { massPlan, todayPlan } from './coach'
import { plural } from './text'

export type ReminderKind = 'checkin' | 'read' | 'train' | 'sleep' | 'photos'
export type Note = { kind: ReminderKind; key: string; title: string; body: string; url: string }

/** Minutos de gracia: si el servidor se atrasa, el aviso todavía sale; después de esto ya no. */
export const LATE_LIMIT = 90

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export function hhmm(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
/** Hora de acostarse: las horas de sueño meta antes de levantarse (regla de Juanma: 9 h). */
export function bedtime(r: Reminders, sleepTarget: number): string {
  return hhmm(minutesOf(r.wake) - sleepTarget * 60)
}

/** El horario del día: a qué minuto suena cada aviso. Los vacíos están apagados. */
export function schedule(r: Reminders, sleepTarget: number): { kind: ReminderKind; at: number }[] {
  const out: { kind: ReminderKind; at: number }[] = []
  if (r.checkin) out.push({ kind: 'checkin', at: minutesOf(r.checkin) })
  if (r.photos) out.push({ kind: 'photos', at: minutesOf(r.wake) })
  if (r.train) out.push({ kind: 'train', at: minutesOf(r.train) })
  if (r.read) out.push({ kind: 'read', at: minutesOf(r.read) })
  out.push({ kind: 'sleep', at: minutesOf(bedtime(r, sleepTarget)) - 30 })
  return out.map(x => ({ ...x, at: ((x.at % 1440) + 1440) % 1440 })).sort((a, b) => a.at - b.at)
}

/** Avisos cuya hora ya pasó y siguen dentro de la gracia. */
export function dueKinds(r: Reminders, sleepTarget: number, now: number): ReminderKind[] {
  if (!r.on) return []
  const d = new Date(now)
  const minute = d.getHours() * 60 + d.getMinutes()
  return schedule(r, sleepTarget).filter(x => minute >= x.at && minute < x.at + LATE_LIMIT).map(x => x.kind)
}

/** La llave que impide mandar el mismo aviso dos veces: una por día (fotos, una por mes). */
export function noteKey(kind: ReminderKind, now: number): string {
  const day = dateKey(new Date(now))
  return kind === 'photos' ? `photos:${day.slice(0, 7)}` : `${kind}:${day}`
}

/** El texto del aviso, o null si ya no hace falta (ya lo hiciste o hoy no toca). */
export function reminderNote(kind: ReminderKind, data: AppData, now: number): Note | null {
  const today = dateKey(new Date(now))
  const key = noteKey(kind, now)
  const r = cleanReminders(data.settings.reminders)
  const modules = modulesOf(data.settings)
  if (kind === 'read' && !modules.reading) return null
  if ((kind === 'train' || kind === 'photos') && !modules.training) return null
  if (kind === 'checkin') {
    if (data.checkins.some(c => c.day === today)) return null
    return { kind, key, url: '/?ir=hoy', title: 'Buenos días, ¿cómo dormiste?', body: 'Check-in de 20 segundos: sueño, energía y dolor. Con eso el coach arma tu día.' }
  }
  if (kind === 'read') {
    const s = streak(data.reading.filter(realReading).map(x => x.day), today)
    if (s.todayDone) return null
    return { kind, key, url: '/?ir=lectura', title: s.current ? `Llevas ${plural(s.current, 'día', 'días')} leyendo` : 'Hoy toca leer',
      body: s.current ? 'Cinco minutos cuentan. Sigue a tu ritmo.' : 'Cinco minutos y arrancas racha nueva.' }
  }
  if (kind === 'train') {
    if (data.sets.some(x => x.day === today)) return null
    const plan = todayPlan(data, now)
    if (plan.kind !== 'torso' && plan.kind !== 'pierna') return null
    return { kind, key, url: '/?ir=entrenar', title: plan.title, body: 'Dos series por ejercicio. Al terminar, proteína y a dormir tus horas.' }
  }
  if (kind === 'sleep') {
    return { kind, key, url: '/?ir=hoy', title: 'En 30 minutos, a la cama',
      body: `Te levantas a las ${r.wake}. Tu meta es dormir ${data.settings.sleepTarget} horas para descansar.` }
  }
  if (!massPlan(data, today).photosDue) return null
  return { kind, key, url: '/?ir=entrenar', title: 'Toca foto de progreso',
    body: 'Frente, lado y espalda, antes de desayunar. Se quedan en tu teléfono; en Bambú solo marcas que ya.' }
}

/** Todo lo que toca mandar ahora, ya filtrado por lo que hiciste. */
export function dueNotes(data: AppData, now: number): Note[] {
  const r = cleanReminders(data.settings.reminders)
  return dueKinds(r, data.settings.sleepTarget, now).flatMap(kind => {
    const note = reminderNote(kind, data, now)
    return note ? [note] : []
  })
}

export function testNote(): Note {
  return { kind: 'checkin', key: 'test', url: '/?ir=ajustes', title: 'Bambú ya te puede avisar', body: 'Así se ven tus recordatorios. Puedes cambiar las horas en Ajustes.' }
}
