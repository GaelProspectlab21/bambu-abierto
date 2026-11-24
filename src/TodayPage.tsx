import { useEffect, useMemo, useState } from 'react'
import { pushState } from './lib/push'
import { cloudConfigured } from './lib/supabase'
import { cleanReminders, dateKey, makeId, modulesOf, type AppData } from './lib/model'
import { backfillDays, realReading, streak } from './lib/progress'
import { todayPlan } from './lib/coach'
import { bibleProgress, book } from './lib/bible'
import { activeSeconds } from './lib/focusStats'
import { readingSeconds } from './lib/readingSession'
import { HabitList } from './HabitsPage'
import { WeekView } from './FocusPage'
import { Card, mmss, useNow } from './ui'
import { nextStep } from './lib/nextStep'
import { Hero } from './Hero'
import { PromiseCard } from './Vara'
import { WeekReportCard } from './Weekly'
import { plural } from './lib/text'
import { NeverTwice, TopStats } from './TodayTop'
import { StretchCard } from './Stretch'
import { HabitNudge } from './PageExtras'
import { dayTotals, planFor } from './lib/nutrition'
import { OPEN_MEAL_KEY } from './FoodPage'
import { Companion } from './Companion'

type Commit = (update: (d: AppData) => AppData) => void

const LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
/**
 * La racha como un tallo: un segmento por día de la última semana. Hoy late si todavía falta.
 * Solo muestra lo que pasó (no castiga): un día vacío es un segmento claro, no una cruz roja.
 */
function StreakStalk({ data, current, best }: { data: AppData; current: number; best: number }) {
  const days = backfillDays(data, dateKey(), 7)
  const todayDone = days[days.length - 1].read
  const record = current > 0 && current >= best
  return <div className="stalk" aria-label={`Racha de lectura: ${plural(current, 'día', 'días')}. Récord: ${best}.`}>
    <div className="stalk-row" aria-hidden="true">{days.map(d => <span key={d.day} className={`node ${d.read ? 'on' : ''} ${d.isToday && !d.read ? 'pending' : ''}`}><i /><small>{LETRA[new Date(`${d.day}T12:00:00`).getDay()]}</small></span>)}</div>
    <p className="stalk-text"><strong>{current} {current === 1 ? 'día' : 'días'}</strong> seguidos{record ? ' · tu récord' : ` · récord ${best}`}{!todayDone && current > 0 ? '. Hoy suma uno más.' : ''}</p>
  </div>
}
export type Section = 'Hoy' | 'Noche' | 'Lectura' | 'Entrenar' | 'Comida' | 'Enfoque' | 'Tareas' | 'Hábitos' | 'Historial' | 'Ajustes'

/** Comida en Hoy: el número que importa según tu modo y el botón para registrar ya. */
function FoodCard({ data, go }: { data: AppData; go: (s: Section) => void }) {
  const plan = planFor(data)
  const t = dayTotals(data, dateKey())
  const title = plan.mode === 'crecimiento' ? `${t.proteinMeals} de 4 comidas con proteína` : plan.kcal ? `${t.kcal} de ${plan.kcal} kcal` : 'Arma tu plan'
  const open = () => { try { sessionStorage.setItem(OPEN_MEAL_KEY, '1') } catch { /* abre la página igual */ } go('Comida') }
  return <Card className="today-card"><span className="eyebrow">COMIDA</span><h2>{title}</h2>
    <p>{plan.mode === 'crecimiento' ? plan.message : plan.kcal && plan.protein ? `Proteína: ${t.protein} de ${plan.protein} g.` : plan.message}</p>
    <button className="primary-button" onClick={open}>Registrar comida <span>↗</span></button></Card>
}

export function TodayPage({ data, commit, go, onMessage }: { data: AppData; commit: Commit; go: (s: Section) => void; onMessage: (t: string, undo?: () => void) => void }) {
  const today = dateKey()
  const now = useNow(true, data.activeFocus || data.activeReading || data.activeWorkout ? 1000 : 60000)
  const hour = new Date().getHours()
  const plan = useMemo(() => todayPlan(data), [data])
  const reading = data.reading.filter(r => r.day === today && realReading(r))
  const readMinutes = Math.floor(reading.reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0) / 60)
  const rs = streak(data.reading.filter(realReading).map(r => r.day))
  const bible = bibleProgress(data, data.settings.bibleOrder)
  const sets = data.sets.filter(s => s.day === today).length
  const next = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (b.level ?? 0) - (a.level ?? 0))[0]
  // Día de descanso del coach: se registra aquí mismo y cumple la misión de entrenar o descansar.
  const restLogged = data.activities.some(a => a.day === today && (a.kind === 'rest' || a.kind === 'walk'))
  function logRest(kind: 'rest' | 'walk', minutes?: number) {
    const row = { id: makeId(), day: today, kind, ...(minutes ? { minutes } : {}) }
    commit(d => ({ ...d, activities: [...d.activities, row] }))
    onMessage(kind === 'walk' ? 'Caminata registrada. Misión cumplida.' : 'Descanso registrado. Misión cumplida.', () => commit(d => ({ ...d, activities: d.activities.filter(a => a.id !== row.id) })))
  }
  // Recordatorios sin activar en la app instalada: se ofrece una vez aquí, donde sí se pueden activar.
  const [pushOff, setPushOff] = useState(false)
  const remindersOn = cleanReminders(data.settings.reminders).on
  // Sin cuenta no hay avisos (viven en el servidor): no se ofrece algo que no va a funcionar.
  useEffect(() => { if (!cloudConfigured) return; pushState().then(st => setPushOff(st === 'off' && !remindersOn)).catch(() => setPushOff(false)) }, [remindersOn])
  const reflected = data.checkins.find(c => c.day === today)?.given !== undefined
  const mod = modulesOf(data.settings)
  const activeHabitsCount = data.settings.habits.filter(h => !h.archived).length
  const step = useMemo(() => nextStep(data, now), [data, Math.floor(now / 60000)]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Hero data={data} step={step} now={now} go={s => go(s as Section)} commit={commit} onMessage={onMessage} />
    <TopStats data={data} go={go} />
    <Companion inline data={data} section="Hoy" go={s => go(s as Section)} commit={commit} now={now} cloud={cloudConfigured} />
    <NeverTwice data={data} go={go} />
    {mod.training && <StretchCard data={data} mode="hoy" />}
    {hour < 21 && <PromiseCard data={data} commit={commit} />}
    {((data.activeReading && !data.activeReading.endedAt) || data.activeFocus || (data.activeWorkout && !data.activeWorkout.endedAt)) && <div className="live-bar">
      {data.activeReading && !data.activeReading.endedAt && <button onClick={() => go('Lectura')}><span>Leyendo</span><strong>{mmss(readingSeconds(data.activeReading, now))}</strong></button>}
      {data.activeFocus && <button onClick={() => go('Enfoque')}><span>Bloque: {data.activeFocus.task}</span><strong>{data.activeFocus.phase === 'ritual' ? 'ritual' : mmss(activeSeconds(data.activeFocus, now))}</strong></button>}
      {data.activeWorkout && !data.activeWorkout.endedAt && <button onClick={() => go('Entrenar')}><span>Entrenando · {sets} series</span><strong>{mmss((now - data.activeWorkout.startedAt) / 1000)}</strong></button>}
    </div>}
    {!reflected && hour >= 19 && step.id !== 'reflect' && <Card tone="quiet" className="closing-nudge"><div><strong>Tu reflexión de la noche</strong><p>Cinco minutos: ¿diste lo que traías hoy?</p></div><button className="secondary-button" onClick={() => go('Noche')}>Abrir</button></Card>}
    {pushOff && <Card tone="quiet" className="push-nudge"><div><strong>Activa tus recordatorios</strong><p>Te aviso para leer, entrenar y dormir, solo si te falta.</p></div><button className="secondary-button" onClick={() => go('Ajustes')}>Activar</button></Card>}
    {/* El domingo cierras la semana; el lunes todavía la ves antes de empezar la nueva. */}
    {(new Date(now).getDay() === 0 || (new Date(now).getDay() === 1 && hour < 14)) && <WeekReportCard data={data} today={today} />}
    <HabitNudge data={data} commit={commit} onMessage={onMessage} />
    {activeHabitsCount > 0 && <Card className="today-habits"><div className="section-heading"><div><span className="eyebrow">RITUALES</span><h2>Hábitos de hoy</h2></div><button className="quiet-button" onClick={() => go('Hábitos')}>Ver semana</button></div><HabitList data={data} commit={commit} /></Card>}
    <h2 className="today-section">Tus áreas</h2>
    <div className="today-grid today-carousel">
      {mod.reading && <Card className="today-card"><span className="eyebrow">LECTURA</span><h2>{reading.length ? `${readMinutes} min leídos` : 'Tu lectura te espera'}</h2>
        <StreakStalk data={data} current={rs.current} best={rs.best} />
        <p>{mod.bible && bible.next ? `Sigue ${book(bible.next.book).name} ${bible.next.chapter}.` : ''}</p>
        <button className="primary-button" onClick={() => go('Lectura')}>{data.activeReading ? 'Volver a la lectura' : reading.length ? 'Leer más' : 'Empezar a leer'} <span>↗</span></button></Card>}
      {mod.training && <Card className="today-card" tone={plan.urgent ? 'warn' : undefined}><span className="eyebrow">ENTRENAMIENTO</span><h2>{plan.title}</h2>
        <p>{sets ? `${plural(sets, 'serie', 'series')} hoy. ` : ''}{plan.items.length ? `${plan.items.slice(0, 3).map(i => i.exercise.name).join(', ')}${plan.items.length > 3 ? ` y ${plan.items.length - 3} más` : ''}.` : plan.summary}</p>
        {plan.kind === 'descanso' && !restLogged
          ? <div className="row-actions">
            <button className="primary-button" onClick={() => logRest('walk', 30)}>Caminé 30 min</button>
            <button className="secondary-button" onClick={() => logRest('rest')}>Descansé hoy</button>
          </div>
          : <button className="primary-button" onClick={() => go('Entrenar')}>Abrir el plan <span>↗</span></button>}</Card>}
      {mod.focus && <Card className="today-card"><span className="eyebrow">ENFOQUE</span><h2>{data.activeFocus ? data.activeFocus.task : next ? next.text : 'Elige tu tarea'}</h2>
        <WeekView data={data} compact />
        <button className="primary-button" onClick={() => go(data.activeFocus ? 'Enfoque' : 'Tareas')}>{data.activeFocus ? 'Volver al bloque' : 'Armar mi bloque'} <span>↗</span></button></Card>}
      {mod.food && <FoodCard data={data} go={go} />}
    </div>
    <button type="button" className="today-more" onClick={() => go('Historial')}>Tu bambú, tu día medido y tu semana <span aria-hidden="true">↗</span></button>
  </>
}
