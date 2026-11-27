import { useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { shiftDay } from './lib/jardin'
import { XP } from './lib/xp'
import { reward } from './juice'
import { haptic } from './lib/haptic'
import { fmtDay } from './ui'
import { newTask, removeTask, toggleTask } from './HoyLista'
import { DuoIcon } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
type When = 'hoy' | 'manana' | 'sin'

export function TareasSimple({ data, commit, onFocus }: { data: AppData; commit: Commit; onFocus: (task?: { id: string; text: string }) => void }) {
  const today = dateKey()
  const [text, setText] = useState('')
  const [when, setWhen] = useState<When>('hoy')
  const [showDone, setShowDone] = useState(false)
  const live = data.tasks.filter(t => t.status !== 'archived')
  const pending = live.filter(t => t.status !== 'done').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt - a.updatedAt)
  const done = live.filter(t => t.status === 'done').sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? '') || b.updatedAt - a.updatedAt).slice(0, 30)
  const doneToday = live.filter(t => t.status === 'done' && t.completedOn === today).length

  function add() {
    if (!text.trim()) return
    haptic(12)
    const due = when === 'hoy' ? today : when === 'manana' ? shiftDay(today, 1) : undefined
    commit(d => ({ ...d, tasks: [newTask(text, due), ...d.tasks] }))
    setText('')
  }
  const tag = (due?: string) => !due || due === today ? '' : due < today ? `Atrasada, ${fmtDay(due)}` : fmtDay(due)

  return <section className="d-page">
    <div className="d-hero blue">
      <div className="d-hero-text">
        <p>Tareas</p>
        <h1>{pending.length ? `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}` : '¡Todo listo!'}</h1>
        <span>{doneToday ? `${doneToday} hecha${doneToday === 1 ? '' : 's'} hoy · +${doneToday * XP.task} XP` : `Cada una vale +${XP.task} XP`}</span>
      </div>
      <DuoIcon name="lista" size={64} />
    </div>

    <button type="button" className="d-btn green wide focus-cta" onClick={() => { haptic(12); onFocus() }}>Bloque de enfoque</button>

    <form className="d-card d-form" onSubmit={e => { e.preventDefault(); add() }}>
      <input className="d-input" value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Escribe una tarea" />
      <div className="d-seg">{([['hoy', 'Hoy'], ['manana', 'Mañana'], ['sin', 'Sin fecha']] as [When, string][]).map(([k, l]) => <button key={k} type="button" className={when === k ? 'on' : ''} aria-pressed={when === k} onClick={() => setWhen(k)}>{l}</button>)}</div>
      <button type="submit" className="d-btn green wide" disabled={!text.trim()}>Agregar tarea</button>
    </form>

    <ul className="d-tasks">
      {pending.map(t => <li key={t.id} className={t.dueDate && t.dueDate < today ? 'late' : ''}>
        <button type="button" className="d-task" onClick={e => { reward(e.currentTarget); toggleTask(commit, t.id, today) }}>
          <span className="d-box" />
          <span className="d-task-text"><b>{t.text}</b>{tag(t.dueDate) && <small>{tag(t.dueDate)}</small>}</span>
        </button>
        <button type="button" className="d-x small focus-play" aria-label={`Bloque de enfoque con ${t.text}`} onClick={() => onFocus({ id: t.id, text: t.text })}>▶</button>
        <button type="button" className="d-x small" aria-label={`Borrar ${t.text}`} onClick={() => removeTask(commit, t.id)}>×</button>
      </li>)}
      {!pending.length && <li className="d-empty">Nada pendiente. Escribe una arriba.</li>}
    </ul>

    {done.length > 0 && <>
      <button type="button" className="d-btn white wide" onClick={() => setShowDone(!showDone)}>{showDone ? 'Ocultar hechas' : `Ver hechas (${done.length})`}</button>
      {showDone && <ul className="d-tasks">{done.map(t => <li key={t.id} className="done">
        <button type="button" className="d-task" onClick={() => toggleTask(commit, t.id, today)}>
          <span className="d-box on"><DuoIcon name="check" size={22} /></span>
          <span className="d-task-text"><b>{t.text}</b>{t.completedOn && <small>{fmtDay(t.completedOn)}</small>}</span>
        </button>
      </li>)}</ul>}
    </>}
  </section>
}
