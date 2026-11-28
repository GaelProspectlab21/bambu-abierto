import { useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { XP } from './lib/xp'
import { reward } from './juice'
import { playSound } from './lib/sounds'
import { haptic } from './lib/haptic'
import { fmtDay } from './ui'
import { newTask, removeTask, toggleTask } from './HoyLista'
import { DuoIcon } from './DuoIcons'
import { BroteArt } from './BroteArt'
import { marcarSapo, moverTarea } from './lib/tareas'
import { DiaPicker } from './DiaPicker'
import { SapoArt, SapoCard } from './Sapo'
import { TareasSemana } from './TareasSemana'

type Commit = (update: (d: AppData) => AppData) => void

export function TareasSimple({ data, commit, onFocus }: { data: AppData; commit: Commit; onFocus: (task?: { id: string; text: string }) => void }) {
  const today = dateKey()
  const [text, setText] = useState('')
  const [due, setDue] = useState<string | undefined>(today)
  const [moviendo, setMoviendo] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [vista, setVista] = useState<'lista' | 'semana'>('lista')
  const [eligiendo, setEligiendo] = useState(false)
  const live = data.tasks.filter(t => t.status !== 'archived')
  const pending = live.filter(t => t.status !== 'done').sort((a, b) => Number(b.sapo === today) - Number(a.sapo === today) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt - a.updatedAt)
  const done = live.filter(t => t.status === 'done').sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? '') || b.updatedAt - a.updatedAt).slice(0, 30)
  const doneToday = live.filter(t => t.status === 'done' && t.completedOn === today).length

  function add() {
    if (!text.trim()) return
    haptic(12)
    commit(d => ({ ...d, tasks: [newTask(text, due), ...d.tasks] }))
    setText('')
  }
  function hecho(el: HTMLElement, id: string) {
    const t = data.tasks.find(x => x.id === id)
    const sapo = t?.sapo === today && t.status !== 'done'
    reward(el, sapo ? `+${XP.task + XP.sapo} XP` : `+${XP.task} XP`)
    if (sapo) playSound('achieve')
    toggleTask(commit, id, today)
  }
  function tocar(el: HTMLElement, id: string) {
    if (eligiendo) { haptic([10, 20, 10]); playSound('ribbit'); commit(d => marcarSapo(d, id, today)); setEligiendo(false); return }
    hecho(el, id)
  }
  const tag = (due?: string) => !due || due === today ? '' : due < today ? `Atrasada, ${fmtDay(due)}` : fmtDay(due)

  return <section className="d-page">
    <div className="d-hero gold">
      <div className="d-hero-text">
        <p>Tareas</p>
        <h1>{pending.length ? `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}` : '¡Todo listo!'}</h1>
        <span>{doneToday ? `${doneToday} hecha${doneToday === 1 ? '' : 's'} hoy · +${doneToday * XP.task} XP` : `Cada una vale +${XP.task} XP`}</span>
      </div>
      <BroteArt mood={!pending.length ? 'orgulloso' : doneToday ? 'animo' : 'feliz'} look="tareas" size={104} />
    </div>

    <button type="button" className="d-btn green wide focus-cta" onClick={() => { haptic(12); onFocus() }}>Bloque de enfoque</button>

    <div className="d-seg" role="tablist" aria-label="Vista de tareas">{([['lista', 'Lista'], ['semana', 'Semana']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={vista === k} className={vista === k ? 'on' : ''} onClick={() => { setVista(k); setEligiendo(false) }}>{l}</button>)}</div>

    {vista === 'semana' ? <TareasSemana data={data} commit={commit} today={today} /> : <>
    <SapoCard data={data} commit={commit} today={today} eligiendo={eligiendo} onElegir={() => setEligiendo(!eligiendo)} onComer={onFocus} onHecho={hecho} />

    <form className="d-card d-form" onSubmit={e => { e.preventDefault(); add() }}>
      <input className="d-input" value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Escribe una tarea" />
      <DiaPicker today={today} value={due} onPick={setDue} />
      <button type="submit" className="d-btn green wide" disabled={!text.trim()}>{due === today ? 'Agregar para hoy' : due ? `Agregar para ${fmtDay(due)}` : 'Agregar sin fecha'}</button>
    </form>

    <ul className={`d-tasks ${eligiendo ? 'eligiendo' : ''}`}>
      {pending.map(t => <li key={t.id} className={`${t.dueDate && t.dueDate < today ? 'late' : ''} ${t.sapo === today ? 'sapo' : ''}`}>
        <button type="button" className="d-task" onClick={e => tocar(e.currentTarget, t.id)}>
          {eligiendo ? <span className="d-box sapo-pick"><SapoArt size={22} /></span> : t.sapo === today ? <span className="d-box sapo-box"><SapoArt size={24} /></span> : <span className="d-box" />}
          <span className="d-task-text"><b>{t.text}</b>{tag(t.dueDate) && <small>{tag(t.dueDate)}</small>}</span>
        </button>
        <button type="button" className={`d-x small dia-mover ${moviendo === t.id ? 'on' : ''}`} aria-label={`Cambiar el día de ${t.text}`} aria-expanded={moviendo === t.id} onClick={() => setMoviendo(moviendo === t.id ? null : t.id)}><DuoIcon name="reloj" size={20} /></button>
        <button type="button" className="d-x small focus-play" aria-label={`Bloque de enfoque con ${t.text}`} onClick={() => onFocus({ id: t.id, text: t.text })}>▶</button>
        <button type="button" className="d-x small" aria-label={`Borrar ${t.text}`} onClick={() => removeTask(commit, t.id)}>×</button>
        {moviendo === t.id && <div className="dia-mover-panel"><DiaPicker today={today} value={t.dueDate} onPick={day => { commit(d => moverTarea(d, t.id, day)); setMoviendo(null) }} /></div>}
      </li>)}
      {!pending.length && <li className="d-empty">Nada pendiente. Escribe una arriba.</li>}
    </ul>

    {done.length > 0 && <>
      <button type="button" className="d-btn white wide" onClick={() => setShowDone(!showDone)}>{showDone ? 'Ocultar hechas' : `Ver hechas (${done.length})`}</button>
      {showDone && <ul className="d-tasks">{done.map(t => <li key={t.id} className="done">
        <button type="button" className="d-task" onClick={() => { playSound('undo'); toggleTask(commit, t.id, today) }}>
          <span className="d-box on"><DuoIcon name="check" size={22} /></span>
          <span className="d-task-text"><b>{t.text}</b>{t.completedOn && <small>{fmtDay(t.completedOn)}</small>}</span>
        </button>
      </li>)}</ul>}
    </>}
    </>}
  </section>
}
