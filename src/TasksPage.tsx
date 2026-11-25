import { useState, type ReactNode } from 'react'
import { dateKey, makeId, type AppData } from './lib/model'
import type { PersonalTask } from './lib/personal'
import { shiftDay } from './lib/progress'
import { suggestPick } from './lib/assist'
import { Card, Chips, Empty, Heading, Tabs, fmtDay } from './ui'
import { plural } from './lib/text'

type Props = { data: AppData; onChange: (tasks: PersonalTask[]) => void; onPrepare: (tasks: PersonalTask[]) => void; busy?: boolean; jevAllowed?: boolean; tabs?: ReactNode }
type View = 'list' | 'board' | 'calendar'
type Filter = 'active' | 'done' | 'archived' | 'all'
type When = 'all' | 'today' | 'overdue' | 'week' | 'none'
const STATUS = { pending: 'Pendiente', in_progress: 'En curso', done: 'Hecha', archived: 'Archivada' } as const
const open = (t: PersonalTask) => t.status === 'pending' || t.status === 'in_progress'
const byDate = (a: PersonalTask, b: PersonalTask) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (b.level ?? 0) - (a.level ?? 0)

export function TasksPage({ data, onChange, onPrepare, busy = false, jevAllowed = false, tabs }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id].slice(0, 8))
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [when, setWhen] = useState<When>('all')
  const [project, setProject] = useState('')
  const [sort, setSort] = useState('date')
  const [month, setMonth] = useState(() => dateKey().slice(0, 7))
  const [selectedDay, setSelectedDay] = useState('')
  const tasks = data.tasks ?? []
  const today = dateKey()
  const pending = tasks.filter(open)
  const overdueCount = pending.filter(t => t.dueDate && t.dueDate < today).length
  const next = [...pending].sort(byDate)[0]
  function change(id: string, patch: Partial<PersonalTask>) {
    onChange(tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now(), ...(patch.status ? { completedOn: patch.status === 'done' ? dateKey() : undefined } : {}) } : t))
  }
  function add() {
    if (!text.trim()) return
    onChange([...tasks, { id: makeId(), text: text.trim(), status: 'pending', minutes: 25, level: null, dueDate: date || undefined, updatedAt: Date.now(), notes: '', project: '', subtasks: [] }])
    setText(''); setDate('')
  }
  const visible = tasks.filter(t =>
    (view === 'board' || filter === 'all' || (filter === 'active' ? open(t) : t.status === filter)) &&
    (!search || [t.text, t.notes, t.project].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())) &&
    (!project || t.project === project) &&
    (when === 'all' || (when === 'today' ? t.dueDate === today : when === 'overdue' ? !!t.dueDate && t.dueDate < today && open(t) : when === 'week' ? !!t.dueDate && t.dueDate >= today && t.dueDate <= shiftDay(today, 6) : !t.dueDate))
  ).sort((a, b) => sort === 'level' ? (b.level ?? 0) - (a.level ?? 0) : sort === 'name' ? a.text.localeCompare(b.text) : byDate(a, b))
  const projects = [...new Set(tasks.map(t => t.project).filter((p): p is string => !!p))]
  const card = (task: PersonalTask) => <TaskCard key={task.id} task={task} onChange={patch => change(task.id, patch)} picked={picked.includes(task.id)} onPick={() => toggle(task.id)} disabled={!!data.activeFocus || busy} blocks={data.focus.filter(row => row.taskId === task.id).length} />

  return <>
    <Heading eyebrow="TAREAS" title="Saca todo de tu cabeza." text="Captura, ponle fecha y elige el siguiente paso." aside={<span className="subtle-count">{pending.length} pendientes{overdueCount ? ` · ${overdueCount} vencidas` : ''}</span>} />
    {tabs}
    {!data.activeFocus && next && <Card tone="accent">
      <span className="eyebrow">TU SIGUIENTE TAREA</span>
      <h2>{next.text}</h2>
      <p>{next.dueDate ? `${next.dueDate < today ? 'Venció' : 'Para'} ${fmtDay(next.dueDate)}` : 'Sin fecha'}{next.level ? ` · nivel ${next.level}` : ''} · {next.minutes} min</p>
      <div className="row-actions"><button className="primary-button" disabled={busy} aria-busy={busy} onClick={() => onPrepare(suggestPick(tasks, 3))}>{busy ? 'Preparando tu bloque' : jevAllowed ? 'Armar mi bloque con Jev' : 'Armar mi bloque'} <span>↗</span></button>
        <button className="secondary-button" disabled={busy} aria-busy={busy} onClick={() => onPrepare([next])}>Solo esta</button></div>
      <p className="hint">{jevAllowed ? 'Elige varias con «Al bloque». Jev recibe el texto y las notas de las tareas elegidas. Tú revisas y empiezas.' : 'Elige varias con «Al bloque». Una regla de este teléfono propone nivel y minutos. Tú revisas y empiezas.'}</p>
    </Card>}
    <Card>
      <form className="capture-row" onSubmit={e => { e.preventDefault(); add() }}>
        <label className="field-label" htmlFor="new-task">Nueva tarea</label>
        <input id="new-task" className="text-input" value={text} maxLength={200} onChange={e => setText(e.target.value)} placeholder="¿Qué tienes pendiente?" required />
        <div className="capture-actions">
          <label className="date-field"><span>Fecha</span><input className="text-input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Fecha de la nueva tarea" /></label>
          <button className="primary-button">Añadir</button>
        </div>
      </form>
    </Card>
    <Tabs label="Vista de tareas" value={view} onChange={setView} options={[['list', 'Lista'], ['board', 'Tablero'], ['calendar', 'Calendario']]} />
    <div className="filter-block">
      {view !== 'board' && <Chips label="Estado" value={filter} onChange={setFilter} options={[['active', 'Pendientes'], ['done', 'Hechas'], ['archived', 'Archivadas'], ['all', 'Todas']]} />}
      <Chips label="Fecha" value={when} onChange={setWhen} options={[['all', 'Cualquier fecha'], ['today', 'Hoy'], ['overdue', 'Vencidas'], ['week', '7 días'], ['none', 'Sin fecha']]} />
      <details className="more-filters"><summary>Buscar y ordenar</summary>
        <input className="text-input" aria-label="Buscar tareas" value={search} onChange={e => setSearch(e.target.value)} placeholder="Título, nota o proyecto" />
        {projects.length > 0 && <Chips label="Proyecto" value={project} onChange={setProject} options={[['', 'Todos'], ...projects.map(p => [p, p] as [string, string])]} />}
        <Chips label="Orden" value={sort} onChange={setSort} options={[['date', 'Por fecha'], ['level', 'Mayor nivel'], ['name', 'Nombre']]} />
      </details>
    </div>
    {view === 'list' && (visible.length ? <div className="task-stack">{visible.map(card)}</div> : <Empty>No hay tareas con estos filtros.</Empty>)}
    {view === 'board' && <div className="task-columns">{Object.entries(STATUS).map(([status, label]) => {
      const col = visible.filter(task => task.status === status)
      return <section key={status}><h2>{label} <small>{col.length}</small></h2>{col.length ? col.map(card) : <Empty>Vacía.</Empty>}</section>
    })}</div>}
    {view === 'calendar' && <Card>
      <label className="field-label month-picker">Mes<input className="text-input" type="month" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setSelectedDay('') } }} /></label>
      <TaskCalendar tasks={visible} month={month} selectedDay={selectedDay} onSelect={setSelectedDay} />
      <h3>{selectedDay ? `Tareas de ${fmtDay(selectedDay)}` : 'Tareas de este mes'}</h3>
      <div className="task-stack">{visible.filter(task => selectedDay ? task.dueDate === selectedDay : task.dueDate?.startsWith(month)).map(card)}</div>
      {visible.some(task => !task.dueDate) && <><h3>Sin fecha</h3><div className="task-stack">{visible.filter(task => !task.dueDate).map(card)}</div></>}
    </Card>}
    {picked.length > 0 && <div className="pick-bar" role="region" aria-label="Bloque en preparación">
      <span>{picked.length} {picked.length === 1 ? 'tarea' : 'tareas'} en el bloque</span>
      <button className="quiet-button" onClick={() => setPicked([])}>Limpiar</button>
      <button className="primary-button" disabled={busy} aria-busy={busy} onClick={() => { onPrepare(tasks.filter(t => picked.includes(t.id))); setPicked([]) }}>{busy ? 'Preparando tu bloque' : jevAllowed ? 'Armar bloque con Jev' : 'Armar bloque'} <span>↗</span></button>
    </div>}
  </>
}

function TaskCard({ task, onChange, onPick, picked, disabled, blocks }: { task: PersonalTask; onChange: (patch: Partial<PersonalTask>) => void; onPick: () => void; picked: boolean; disabled: boolean; blocks: number }) {
  const [subtask, setSubtask] = useState('')
  const subtasks = task.subtasks ?? []
  const today = dateKey()
  const overdue = task.dueDate && task.dueDate < today && open(task)
  const done = task.status === 'done'
  return <article className={`task-card ${done ? 'is-done' : ''} ${task.status === 'archived' ? 'is-archived' : ''}`}>
    <div className="task-head">
      <label className="task-check"><input type="checkbox" aria-label={`Completar ${task.text}`} checked={done} onChange={() => onChange({ status: done ? 'pending' : 'done' })} /><span>{task.text}</span></label>
      {open(task) && <button className={`pick-btn ${picked ? 'on' : ''}`} aria-pressed={picked} disabled={disabled} onClick={onPick}>{picked ? 'En el bloque ✓' : 'Al bloque'}</button>}
    </div>
    <div className="task-tags">
      {task.dueDate && <time className={overdue ? 'tag tag-warn' : 'tag'} dateTime={task.dueDate}>{overdue ? 'Venció ' : ''}{fmtDay(task.dueDate)}</time>}
      {task.status === 'in_progress' && <span className="tag tag-on">En curso</span>}
      {task.status === 'archived' && <span className="tag">Archivada</span>}
      {task.project && <span className="tag">{task.project}</span>}
      {task.level ? <span className="tag">Nivel {task.level}</span> : null}
      {subtasks.length > 0 && <span className="tag">{subtasks.filter(s => s.done).length}/{subtasks.length} pasos</span>}
      {blocks > 0 && <span className="tag">{blocks} {blocks === 1 ? 'bloque' : 'bloques'}</span>}
    </div>
    <details className="task-more"><summary>Editar</summary>
      <label className="field-label">Título<input className="text-input" value={task.text} maxLength={200} onChange={e => { if (e.target.value.trim()) onChange({ text: e.target.value }) }} /></label>
      <label className="field-label">Estado</label>
      <Chips label="Estado de la tarea" value={task.status} onChange={status => onChange({ status })} options={Object.entries(STATUS) as [PersonalTask['status'], string][]} />
      <div className="task-grid">
        <label className="field-label">Fecha<input className="text-input" aria-label={`Fecha de ${task.text}`} type="date" value={task.dueDate ?? ''} onChange={e => onChange({ dueDate: e.target.value || undefined })} /></label>
        <label className="field-label">Minutos<input className="text-input" type="number" min={1} max={180} value={task.minutes} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 180) onChange({ minutes: n }) }} /></label>
        <label className="field-label">Proyecto<input className="text-input" value={task.project ?? ''} maxLength={60} placeholder="Escuela, casa, personal" onChange={e => onChange({ project: e.target.value })} /></label>
      </div>
      <label className="field-label">Nivel</label>
      <Chips label="Nivel" value={task.level ?? 0} onChange={n => onChange({ level: n || null })} options={[[0, 'Sin nivel'], [1, '1'], [2, '2'], [3, '3'], [4, '4 · más impacto']]} />
      <label className="field-label">Notas<textarea className="text-input" aria-label="Notas de la tarea" value={task.notes ?? ''} maxLength={4000} onChange={e => onChange({ notes: e.target.value })} /></label>
      <h3>Pasos pequeños <small>{subtasks.filter(item => item.done).length} de {subtasks.length}</small></h3>
      {subtasks.map(item => <div key={item.id} className="subtask-row"><label className="checkbox-label"><input type="checkbox" checked={item.done} onChange={() => onChange({ subtasks: subtasks.map(row => row.id === item.id ? { ...row, done: !row.done } : row) })} />{item.text}</label><button className="quiet-button" aria-label={`Quitar subtarea ${item.text}`} onClick={() => onChange({ subtasks: subtasks.filter(row => row.id !== item.id) })}>Quitar</button></div>)}
      <form className="subtask-add" onSubmit={e => { e.preventDefault(); if (!subtask.trim()) return; onChange({ subtasks: [...subtasks, { id: makeId(), text: subtask.trim(), done: false }] }); setSubtask('') }}>
        <input className="text-input" aria-label="Nueva subtarea" maxLength={200} value={subtask} onChange={e => setSubtask(e.target.value)} placeholder="El primer paso" />
        <button className="secondary-button">Añadir paso</button>
      </form>
      <div className="row-actions"><button className="quiet-button" onClick={() => onChange({ status: task.status === 'archived' ? 'pending' : 'archived' })}>{task.status === 'archived' ? 'Recuperar tarea' : 'Archivar tarea'}</button></div>
    </details>
  </article>
}

function TaskCalendar({ tasks, month, selectedDay, onSelect }: { tasks: PersonalTask[]; month: string; selectedDay: string; onSelect: (day: string) => void }) {
  const first = new Date(`${month}-01T12:00:00`)
  const offset = (first.getDay() + 6) % 7
  const start = shiftDay(`${month}-01`, -offset)
  return <div className="task-calendar" aria-label="Calendario de tareas"><div className="calendar-weekdays">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-cells">{Array.from({ length: 42 }, (_, i) => {
    const day = shiftDay(start, i)
    const dayTasks = tasks.filter(task => task.dueDate === day)
    return <button key={day} className={`${day.startsWith(month) ? '' : 'outside-month'} ${day === dateKey() ? 'is-today' : ''}`} aria-pressed={selectedDay === day} aria-label={`${day}, ${plural(dayTasks.length, 'tarea', 'tareas')}`} onClick={() => onSelect(day)}><span>{Number(day.slice(-2))}</span>{dayTasks.slice(0, 2).map(task => <small key={task.id}>{task.text}</small>)}{dayTasks.length > 2 && <small>+{dayTasks.length - 2} más</small>}</button>
  })}</div></div>
}
