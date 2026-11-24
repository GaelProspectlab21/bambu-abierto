/**
 * Sugerencias de la mascota por sección. Cada una sale de TUS datos de esa pantalla y trae,
 * cuando se puede, el botón que la ejecuta. Si no hay nada útil que decir, no inventa: calla.
 */
import { activeHabits, cleanReminders, dateKey, modulesOf, type AppData } from './model'
import { realReading, streak } from './progress'
import { bibleProgress, book } from './bible'
import { shift } from './coach'
import { broteSays } from './brote'
import { compareDay } from './measure'
import { game } from './gamification'
import { plural } from './text'
import { planFor } from './nutrition'

export type SectionId = 'Hoy' | 'Noche' | 'Lectura' | 'Entrenar' | 'Comida' | 'Enfoque' | 'Tareas' | 'Hábitos' | 'Historial' | 'Ajustes'
export type Cta = { label: string; go: SectionId } | { label: string; habit: string }
export type Suggestion = { id: string; text: string; cta?: Cta }
/** Cómo se ve la mascota en cada sección. */
export type Look = 'base' | 'lector' | 'tareas' | 'habitos' | 'noche' | 'historial' | 'ajustes'

export function lookOf(section: SectionId): Look {
  return section === 'Lectura' ? 'lector' : section === 'Tareas' || section === 'Enfoque' ? 'tareas' : section === 'Hábitos' ? 'habitos'
    : section === 'Noche' ? 'noche' : section === 'Historial' ? 'historial' : section === 'Ajustes' ? 'ajustes' : 'base'
}

const open = (t: AppData['tasks'][number]) => t.status === 'pending' || t.status === 'in_progress'
const byPriority = (a: AppData['tasks'][number], b: AppData['tasks'][number]) => (b.level ?? 0) - (a.level ?? 0) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')

/** Racha de un hábito: días seguidos hasta hoy (o ayer, si hoy aún no lo marcas). */
function habitStreak(today: string, done: (day: string) => boolean): number {
  let n = 0
  for (let d = done(today) ? today : shift(today, -1); done(d); d = shift(d, -1)) n++
  return n
}

export function suggestionsFor(section: SectionId, data: AppData, now = Date.now(), opts: { cloud: boolean } = { cloud: false }): Suggestion[] {
  const today = dateKey(new Date(now))
  const out: Suggestion[] = []
  const row = data.checkins.find(c => c.day === today)
  const mod = modulesOf(data.settings)
  const tasks = data.tasks.filter(open).sort(byPriority)
  const habits = activeHabits(data.settings)
  const marked = new Set(data.habits[today] ?? [])

  if (section === 'Hoy') {
    out.push({ id: 'say', text: broteSays(data, now).lines[0] })
    if (row?.capacity !== undefined && mod.focus && tasks[0]) {
      out.push(row.capacity <= 40
        ? { id: 'low', text: `Hoy traes ${row.capacity}%: elige UNA cosa y ya. Sugiero «${tasks[0].text}».`, cta: { label: 'Ver tareas', go: 'Tareas' } }
        : row.capacity >= 80 ? { id: 'high', text: `Traes ${row.capacity}%: lo difícil primero. «${tasks[0].text}» antes que cualquier otra cosa.`, cta: { label: 'Ver tareas', go: 'Tareas' } } : { id: 'mid', text: 'Con una medida normal, una cosa importante y una pequeña bastan. No acumules.' })
    }
    const left = habits.filter(h => !h.auto && !marked.has(h.id))
    if (left.length && left.length <= 3 && marked.size > 0) out.push({ id: 'left', text: `Te faltan ${left.map(h => h.label).join(', ')}. Cuesta menos que todo lo que ya hiciste.`, cta: { label: 'Marcar', go: 'Hábitos' } })
  }

  if (section === 'Lectura' && mod.reading) {
    const rs = streak(data.reading.filter(realReading).map(r => r.day), today)
    const read = data.reading.some(r => r.day === today && realReading(r))
    if (data.activeReading && !data.activeReading.endedAt) out.push({ id: 'live', text: 'Estás leyendo. Al terminar, marca lo que leíste y guarda UNA idea tuya.' })
    else if (!read) {
      const next = mod.bible ? bibleProgress(data, data.settings.bibleOrder, today).next : null
      out.push({ id: 'start', text: next ? `Sigue ${book(next.book).name} ${next.chapter}. Cinco minutos cuentan como día leído${rs.current ? ` y cuidan tu racha de ${rs.current}` : ''}.` : `Cinco minutos cuentan como día leído${rs.current ? ` y cuidan tu racha de ${rs.current}` : ''}. Empieza ya, sin elegir el libro perfecto.` })
    } else out.push({ id: 'done', text: 'Ya leíste hoy. Todo lo extra es de más: úsalo si de verdad quieres, no para rendir.' })
    const week = Array.from({ length: 7 }, (_, i) => shift(today, -i))
    const days = week.filter(d => data.reading.some(r => r.day === d && realReading(r))).length
    if (days < 7) out.push({ id: 'week', text: `Esta semana leíste ${days} de 7 días. ${days >= 5 ? 'Vas bien: no busques el 7 a costa de dormir.' : 'Ata la lectura a algo fijo (después de cenar, antes de dormir) en vez de buscar tiempo.'}` })
    if (row?.capacity !== undefined && row.capacity <= 40) out.push({ id: 'low', text: `Hoy traes ${row.capacity}%: cinco minutos son una victoria completa. No pelees por más.` })
  }

  if (section === 'Tareas' || section === 'Enfoque') {
    if (mod.focus) {
      const overdue = tasks.filter(t => t.dueDate && t.dueDate < today)
      if (data.activeFocus) out.push({ id: 'live', text: 'Tienes un bloque en curso. Termínalo antes de abrir otro frente.' })
      else if (!tasks.length) out.push({ id: 'empty', text: 'Vacía tu cabeza: anota tres pendientes aunque sean chicos. Lo que no está escrito pesa.' })
      else {
        const t = tasks[0]
        out.push({ id: 'first', text: `Empieza por «${t.text}»${t.level ? ` (N${t.level})` : ''}: es lo que más mueve${t.dueDate && t.dueDate <= today ? ' y ya vence' : ''}.` })
        const noLevel = tasks.filter(x => !x.level).length
        if (noLevel >= 2) out.push({ id: 'jev', text: `${plural(noLevel, 'tarea', 'tareas')} no tienen nivel. Márcalas y deja que Jev acomode nivel y minutos; tú solo revisas.` })
        const short = tasks.filter(x => (x.minutes ?? 25) <= 25).slice(0, 3)
        if (short.length >= 2) out.push({ id: 'batch', text: `Junta ${plural(short.length, 'tarea', 'tareas')} cortas en un solo bloque: «${short.map(x => x.text).join('», «')}». Menos cambios de contexto, menos fricción.` })
      }
      if (overdue.length) out.push({ id: 'overdue', text: `${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}. Resuelve la más vieja o muévela de fecha con honestidad.` })
      if (row?.capacity !== undefined && row.capacity <= 40) out.push({ id: 'low', text: `Con ${row.capacity}% hoy, un bloque de 25 minutos basta. No armes tres.` })
    }
  }

  if (section === 'Comida' && mod.food) {
    const plan = planFor(data, now)
    out.push({ id: 'food', text: plan.message })
    if (plan.mode === 'crecimiento' && plan.fuel !== 'bajo') out.push({ id: 'food-grow', text: 'Lo más fácil para subir proteína: un vaso de leche o un yogur con tu colación.' })
  }

  if (section === 'Hábitos' && habits.length) {
    const rate = (id: string) => Array.from({ length: 30 }, (_, i) => shift(today, -i)).filter(d => (data.habits[d] ?? []).includes(id)).length
    const manual = habits.filter(h => !h.auto)
    const weakest = [...manual].sort((a, b) => rate(a.id) - rate(b.id))[0]
    if (weakest && rate(weakest.id) < 20) out.push({ id: 'weak', text: `«${weakest.label}» es tu hábito más flojo (${Math.round(rate(weakest.id) / 30 * 100)}% en 30 días). Hazlo versión mini: dos minutos, atado a algo que ya haces.`, cta: marked.has(weakest.id) ? undefined : { label: `Marcar ${weakest.label}`, habit: weakest.id } })
    const best = [...manual].map(h => ({ h, n: habitStreak(today, d => (data.habits[d] ?? []).includes(h.id)) })).sort((a, b) => b.n - a.n)[0]
    if (best && best.n >= 3) out.push({ id: 'best', text: `Tu racha más larga es «${best.h.label}»: ${plural(best.n, 'día', 'días')}. Sigue igual; no le sumes más.` })
    const left = habits.filter(h => !h.auto && !marked.has(h.id))
    if (left.length) out.push({ id: 'left', text: `Hoy te falta: ${left.slice(0, 3).map(h => h.label).join(', ')}.` })
  }

  if (section === 'Noche') {
    const c = compareDay(data, today, row?.capacity ?? null)
    if (row?.given !== undefined) out.push({ id: 'done', text: 'Ya cerraste el día. Lo que sigue es dormir.' })
    else {
      out.push({ id: 'honest', text: 'Primero la verdad sobre cuánto traías esta mañana. Mueve los controles sin pensar en lo que «debías» hacer.' })
      c.lines.slice(0, 2).forEach((l, i) => out.push({ id: `cmp${i}`, text: l }))
    }
  }

  if (section === 'Historial') {
    const g = game(data, today)
    const byDay = new Map<number, { solid: number; total: number }>()
    data.checkins.filter(c => c.capacity !== undefined && c.day <= today).slice(-60).forEach(c => {
      const wd = new Date(`${c.day}T12:00:00`).getDay()
      const e = byDay.get(wd) ?? { solid: 0, total: 0 }
      e.total++; if (c.given !== undefined && c.capacity !== undefined && c.given >= c.capacity - 5) e.solid++
      byDay.set(wd, e)
    })
    const rows = [...byDay.entries()].filter(([, e]) => e.total >= 3).map(([wd, e]) => ({ wd, rate: e.solid / e.total }))
    const names = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
    if (rows.length >= 3) {
      const worst = [...rows].sort((a, b) => a.rate - b.rate)[0], best = [...rows].sort((a, b) => b.rate - a.rate)[0]
      if (worst.wd !== best.wd) out.push({ id: 'wd', text: `Tus ${names[best.wd]} son los que más das (${Math.round(best.rate * 100)}% de los días) y tus ${names[worst.wd]} los que menos (${Math.round(worst.rate * 100)}%). Pon lo importante en los primeros y algo ligero en los segundos.` })
    } else out.push({ id: 'few', text: 'Con unas tres semanas de reflexiones te digo qué día de la semana das más y cuál menos. Sigue midiendo.' })
    if (g.gave.streak >= 3) out.push({ id: 'streak', text: `Llevas ${plural(g.gave.streak, 'día', 'días')} seguidos dando lo que traías. Eso es lo que se acumula.` })
  }

  if (section === 'Ajustes') {
    if (!data.profile.north?.trim()) out.push({ id: 'north', text: 'Escribe tu norte (en quién te quieres convertir). La reflexión de la noche te lo pregunta cada día.' })
    if (opts.cloud && !cleanReminders(data.settings.reminders).on) out.push({ id: 'remind', text: 'Activa los recordatorios: es lo que más baja la fricción de la reflexión de la noche.' })
    if (opts.cloud) out.push({ id: 'nfc', text: 'Si tienes una etiqueta NFC, puedes grabar el enlace de «Noche»: un toque abre tu reflexión.' })
    if (!opts.cloud) out.push({ id: 'backup', text: 'Estás sin cuenta: descarga tu respaldo de vez en cuando, tus datos solo viven en este teléfono.' })
  }
  return out.slice(0, 3)
}
