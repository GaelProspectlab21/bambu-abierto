import { useState } from 'react'
import { isStretch } from './lib/stretch'
import { activeHabits, dateKey, makeId, type AppData, type HabitDef } from './lib/model'
import { realReading } from './lib/progress'
import { shift } from './lib/coach'
import { Card, Heading, fmtDay } from './ui'
import { haptic } from './lib/haptic'
import { reward } from './juice'

type Commit = (update: (d: AppData) => AppData) => void

/** ¿Está hecho el hábito ese día? Marca manual o detectado por lo que registraste. */
export function habitDone(data: AppData, habit: HabitDef, day: string): 'manual' | 'auto' | null {
  if ((data.habits[day] ?? []).includes(habit.id)) return 'manual'
  // Un hábito de estirar ("Estirar", "Estiramiento antes de dormir") se marca solo con la rutina guiada.
  if ((habit.id === 'estirar' || habit.id === 'stretch' || /estira/i.test(habit.label)) && data.activities.some(a => a.day === day && isStretch(a))) return 'auto'
  if (!habit.auto) return null
  const auto = habit.auto === 'bible' ? data.bible.some(m => m.day === day) || data.reading.some(r => r.day === day && realReading(r) && (!!r.bible?.length || /biblia/i.test(r.title ?? '')))
    : habit.auto === 'reading' ? data.reading.some(r => r.day === day && realReading(r))
      : habit.auto === 'training' ? data.sets.some(s => s.day === day) || data.activities.some(a => a.day === day && (a.kind === 'football' || a.kind === 'walk'))
        : data.focus.some(f => f.day === day && f.minutes > 0)
  return auto ? 'auto' : null
}

export function toggleHabit(commit: Commit, id: string, day = dateKey()) {
  haptic()
  commit(d => {
    const current = d.habits[day] ?? []
    return { ...d, habits: { ...d.habits, [day]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] } }
  })
}

/** Conteo como un tallo de bambú: un nudo por hábito, relleno el que ya se hizo. */
export function HabitTally({ done, total, label }: { done: number; total: number; label: string }) {
  return <div className="tally" role="img" aria-label={`${done} de ${total}: ${label}`}>
    <div className="tally-num"><strong>{done}</strong><span>de {total}</span></div>
    <div className="tally-stalk" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}</div>
    <small>{label}</small>
  </div>
}

export function HabitList({ data, commit, day = dateKey() }: { data: AppData; commit: Commit; day?: string }) {
  return <div className="habit-list">{activeHabits(data.settings).map(h => {
    const done = habitDone(data, h, day)
    return <button key={h.id} className={`habit-row ${done ? 'done' : ''}`} aria-pressed={!!done} onClick={e => { if (done === 'auto') return; if (!done) reward(e.currentTarget); toggleHabit(commit, h.id, day) }} title={done === 'auto' ? 'Marcado solo por lo que registraste' : undefined}>
      <span className="habit-check">{done ? '✓' : h.mark}</span><span className="habit-name">{h.label}</span><span className="habit-status">{done === 'auto' ? 'Automático' : done ? 'Hecho' : 'Marcar'}</span></button>
  })}</div>
}

export function HabitsPage({ data, commit }: { data: AppData; commit: Commit }) {
  const today = dateKey()
  const [day, setDay] = useState(today)
  const habits = activeHabits(data.settings)
  const days = Array.from({ length: 7 }, (_, i) => shift(today, i - 6))
  const last30 = Array.from({ length: 30 }, (_, i) => shift(today, -i))
  const done = habits.filter(h => habitDone(data, h, day)).length
  return <>
    <Heading eyebrow="SIN CASTIGAR LOS DÍAS DIFÍCILES" title="Hábitos" text="Marca lo que pasó. Lo que ya registraste en Bambú se marca solo." aside={<HabitTally done={done} total={habits.length} label={fmtDay(day)} />} />
    <div className="day-switch">{days.map(d => <button key={d} className={d === day ? 'chip on' : 'chip'} onClick={() => setDay(d)}>{d === today ? 'Hoy' : new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric' }).format(new Date(`${d}T12:00:00`))}</button>)}</div>
    <Card><HabitList data={data} commit={commit} day={day} /></Card>
    <Card><h2>La semana</h2><div className="habit-table"><div className="habit-table-head"><span />{days.map(d => <span key={d}>{new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' }).format(new Date(`${d}T12:00:00`))}</span>)}<span>30 días</span></div>
      {habits.map(h => <div key={h.id} className="habit-table-row"><span>{h.label}</span>{days.map(d => { const s = habitDone(data, h, d); return <span key={d} className={`dot ${s ? 'on' : ''}`} aria-label={`${h.label} ${d}: ${s ? 'hecho' : 'sin registro'}`} /> })}<b>{Math.round(last30.filter(d => habitDone(data, h, d)).length / 30 * 100)}%</b></div>)}</div>
      <p className="hint">Un punto vacío no dice que fallaste: dice que no hay registro.</p></Card>
  </>
}

export function HabitEditor({ data, commit }: { data: AppData; commit: Commit }) {
  const [label, setLabel] = useState('')
  const list = data.settings.habits
  const save = (habits: HabitDef[]) => commit(d => ({ ...d, settings: { ...d.settings, habits } }))
  const move = (i: number, dir: -1 | 1) => { const next = [...list]; const j = i + dir; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; save(next) }
  return <Card><h2>Tus hábitos</h2><p className="hint">Archivar no borra el historial. Los automáticos se marcan solos con lo que registras.</p>
    <ul className="habit-editor">{list.map((h, i) => <li key={h.id} className={h.archived ? 'archived' : ''}>
      <input className="text-input" value={h.label} maxLength={60} aria-label={`Nombre de ${h.label}`} onChange={e => save(list.map(x => x.id === h.id ? { ...x, label: e.target.value || x.label } : x))} />
      <select className="text-input narrow" value={h.auto ?? ''} aria-label="Automático" onChange={e => save(list.map(x => x.id === h.id ? { ...x, auto: (e.target.value || undefined) as HabitDef['auto'] } : x))}><option value="">Manual</option><option value="bible">Si leo Biblia</option><option value="reading">Si leo</option><option value="training">Si entreno</option><option value="focus">Si hago un bloque</option></select>
      <button className="quiet-button reorder" aria-label={`Subir ${h.label}`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className="quiet-button reorder" aria-label={`Bajar ${h.label}`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
      <button className="quiet-button" onClick={() => save(list.map(x => x.id === h.id ? { ...x, archived: !x.archived || undefined } : x))}>{h.archived ? 'Recuperar' : 'Archivar'}</button></li>)}</ul>
    <form className="inline-form" onSubmit={e => { e.preventDefault(); if (!label.trim()) return; save([...list, { id: `h-${makeId().slice(0, 8)}`, label: label.trim(), mark: label.trim().charAt(0).toUpperCase() }]); setLabel('') }}><input className="text-input" value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder="Nuevo hábito" /><button className="secondary-button">Añadir</button></form>
  </Card>
}
