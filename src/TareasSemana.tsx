import { useState } from 'react'
import type { AppData } from './lib/model'
import { shiftDay } from './lib/jardin'
import { lunesDe, moverTarea, semanaDe } from './lib/tareas'
import { newTask, toggleTask } from './HoyLista'
import { haptic } from './lib/haptic'
import { SapoArt } from './Sapo'

type Commit = (update: (d: AppData) => AppData) => void
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SIN = 'sin'

/**
 * El tablero de la semana. Para mover una tarea: tócala y luego toca el día (sirve igual en el iPhone).
 * En la laptop también se arrastra. Cada día tiene su "+" para agregar ahí mismo.
 */
export function TareasSemana({ data, commit, today }: { data: AppData; commit: Commit; today: string }) {
  const [lunes, setLunes] = useState(() => lunesDe(today))
  const [moviendo, setMoviendo] = useState<string | null>(null)
  const [agregando, setAgregando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const { dias, sinFecha } = semanaDe(data, lunes)
  const tarea = moviendo ? data.tasks.find(t => t.id === moviendo) : undefined
  const domingo = shiftDay(lunes, 6)
  const titulo = lunes === lunesDe(today) ? 'Esta semana' : lunes === shiftDay(lunesDe(today), 7) ? 'La próxima semana' : lunes < lunesDe(today) ? 'Semana pasada' : 'Más adelante'

  function soltar(day: string | undefined) {
    if (!moviendo) return
    haptic(10)
    commit(d => moverTarea(d, moviendo, day))
    setMoviendo(null)
  }
  function agregar(day: string | undefined) {
    if (!texto.trim()) { setAgregando(null); return }
    haptic(12)
    commit(d => ({ ...d, tasks: [newTask(texto, day), ...d.tasks] }))
    setTexto('')
  }
  const chip = (t: AppData['tasks'][number], day?: string) => <li key={t.id} className={`sem-task ${t.status === 'done' ? 'done' : ''} ${moviendo === t.id ? 'moving' : ''} ${day && t.sapo === day ? 'sapo' : ''}`}
    draggable={t.status !== 'done'} onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); setMoviendo(t.id) }}>
    <button type="button" className="sem-check" aria-label={t.status === 'done' ? `Desmarcar ${t.text}` : `Marcar ${t.text}`} onClick={() => toggleTask(commit, t.id, today)}>{t.status === 'done' ? '✓' : ''}</button>
    <button type="button" className="sem-text" aria-pressed={moviendo === t.id} disabled={t.status === 'done'} onClick={() => setMoviendo(moviendo === t.id ? null : t.id)}>
      {day && t.sapo === day && <SapoArt size={20} />}{t.text}
    </button>
  </li>
  const columna = (key: string, nombre: string, sub: string, day: string | undefined, tareas: AppData['tasks'], hoy = false, pasado = false) =>
    <section key={key} className={`sem-day ${hoy ? 'today' : ''} ${pasado ? 'past' : ''} ${moviendo ? 'target' : ''}`}
      onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) { commit(d => moverTarea(d, id, day)); setMoviendo(null) } }}>
      <header>
        {moviendo
          ? <button type="button" className="sem-drop" onClick={() => soltar(day)}>Mover a {nombre.toLowerCase()}</button>
          : <><b>{nombre}</b><small>{sub}</small><button type="button" className="sem-plus" aria-label={`Agregar tarea al ${nombre.toLowerCase()}`} onClick={() => { setAgregando(agregando === key ? null : key); setTexto('') }}>+</button></>}
      </header>
      {agregando === key && <form className="sem-add" onSubmit={e => { e.preventDefault(); agregar(day) }}>
        <input className="d-input" autoFocus value={texto} maxLength={200} onChange={e => setTexto(e.target.value)} placeholder="Nueva tarea" />
      </form>}
      <ul>{tareas.map(t => chip(t, day))}{!tareas.length && agregando !== key && <li className="sem-empty">Libre</li>}</ul>
    </section>

  return <div className="sem">
    <div className="sem-nav">
      <button type="button" className="d-btn white small" aria-label="Semana anterior" onClick={() => setLunes(shiftDay(lunes, -7))}>‹</button>
      <div><b>{titulo}</b><small>{fecha(lunes)} al {fecha(domingo)}</small></div>
      <button type="button" className="d-btn white small" aria-label="Semana siguiente" onClick={() => setLunes(shiftDay(lunes, 7))}>›</button>
    </div>
    {tarea && <p className="sem-hint">Moviendo <b>{tarea.text}</b>. Toca el día al que va. <button type="button" className="d-link" onClick={() => setMoviendo(null)}>Cancelar</button></p>}
    <div className="sem-grid">
      {dias.map((d, i) => columna(d.day, DIAS[i], fecha(d.day), d.day, d.tareas, d.day === today, d.day < today))}
      {columna(SIN, 'Sin fecha', 'cuando se pueda', undefined, sinFecha)}
    </div>
  </div>
}

function fecha(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
}
