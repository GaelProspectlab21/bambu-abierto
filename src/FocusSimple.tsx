import { useEffect, useRef, useState } from 'react'
import type { AppData } from './lib/model'
import { dateKey } from './lib/model'
import { BINAURAL, PAUSE_REASONS, activeSeconds, counts, hm } from './lib/focusStats'
import { addItem, closeBlock, startBlock, toggleItem, type Pick } from './lib/bloque'
import { BinauralAudio } from './BinauralAudio'
import { chime, mmss, useNow, useWakeLock } from './ui'
import { haptic } from './lib/haptic'
import { reward } from './juice'
import { playSound } from './lib/sounds'
import type { Preset } from './FocusPage'

type Commit = (update: (d: AppData) => AppData) => void
type Props = { data: AppData; commit: Commit; onMessage: (text: string, undo?: () => void) => void; preset?: Preset | null; onPresetUsed?: () => void }
const MINUTES = [25, 45, 60, 90]

/** Bloque de enfoque simple: elegir, empezar, palomear, cerrar. Sirve igual en el celular y en la laptop. */
export function FocusBlock(props: Props) {
  const a = props.data.activeFocus
  if (!a) return <Setup {...props} />
  if (a.endedAt || a.phase === 'closing') return <Closing {...props} />
  return <Running {...props} />
}

function Setup({ data, commit, preset, onPresetUsed }: Props) {
  const open = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const [picks, setPicks] = useState<Pick[]>(() => preset?.task ? [{ id: preset.taskId, text: preset.task }] : [])
  const [text, setText] = useState('')
  const last = [...data.focus].filter(counts).sort((x, y) => (y.startedAt ?? 0) - (x.startedAt ?? 0))[0]
  const [minutes, setMinutes] = useState(preset?.minutes ?? last?.plannedMinutes ?? 45)
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<number | undefined>(undefined)
  useEffect(() => { if (preset) onPresetUsed?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const has = (id: string) => picks.some(p => p.id === id)
  const toggle = (id: string, label: string) => setPicks(p => has(id) ? p.filter(x => x.id !== id) : [...p, { id, text: label }])
  function addText() { if (text.trim()) { setPicks(p => [...p, { text: text.trim() }]); setText('') } }
  function begin() {
    const all = text.trim() ? [...picks, { text: text.trim() }] : picks
    if (!all.length) return
    haptic([12, 30, 12])
    playSound('focusStart')
    commit(d => startBlock(d, all, minutes, Date.now(), { goal, level }))
  }
  const today = data.focus.filter(r => r.day === dateKey() && counts(r))
  return <div className="fb">
    <section className="d-card fb-card">
      <h2 className="fb-title">¿Qué vas a mover?</h2>
      <p className="d-hint left">Toca una o varias. Las palomeas conforme las termines.</p>
      {open.length > 0 && <div className="fb-tasks">{open.slice(0, 12).map(t => <button key={t.id} type="button" className={has(t.id) ? 'on' : ''} aria-pressed={has(t.id)} onClick={() => toggle(t.id, t.text)}><i aria-hidden="true">{has(t.id) ? '✓' : ''}</i><span>{t.text}</span></button>)}</div>}
      {picks.filter(p => !p.id).map((p, i) => <div key={i} className="fb-loose"><span>{p.text}</span><button type="button" className="d-x small" aria-label={`Quitar ${p.text}`} onClick={() => setPicks(x => x.filter(y => y !== p))}>×</button></div>)}
      <form className="fb-add" onSubmit={e => { e.preventDefault(); addText() }}>
        <input className="d-input" value={text} maxLength={200} onChange={e => setText(e.target.value)} placeholder={open.length ? 'U otra cosa' : 'Ej. grabar la intro del video'} />
        {text.trim() && <button type="submit" className="d-btn white">Agregar</button>}
      </form>
      <div className="fb-label">Minutos</div>
      <div className="d-seg">{MINUTES.map(m => <button key={m} type="button" className={minutes === m ? 'on' : ''} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}</button>)}</div>
      <details className="d-more"><summary>Más opciones</summary>
        <div className="fb-label">Qué tanto mueve tu semana</div>
        <div className="d-seg">{[4, 3, 2, 1].map(n => <button key={n} type="button" className={level === n ? 'on' : ''} title={data.settings.leverageLabels[String(n)]} onClick={() => setLevel(level === n ? undefined : n)}>N{n}</button>)}</div>
        <input className="d-input" value={goal} maxLength={300} onChange={e => setGoal(e.target.value)} placeholder="Meta concreta, ej. 3 escenas grabadas" />
      </details>
      <button type="button" className="d-btn green wide" disabled={!picks.length && !text.trim()} onClick={begin}>Empezar {minutes} min</button>
      <p className="d-hint">Antes: celular lejos, una sola pestaña, agua a la mano.</p>
    </section>
    {today.length > 0 && <section className="d-card fb-card"><div className="fb-label">Hoy llevas {hm(today.reduce((s, r) => s + r.minutes, 0))} en foco</div>
      <ul className="fb-today">{today.map(r => <li key={r.id}><span>{r.task}</span><b>{r.minutes} min</b></li>)}</ul></section>}
  </div>
}

function Running({ data, commit, onMessage }: Props) {
  const a = data.activeFocus!
  const now = useNow(true)
  useWakeLock(!a.pausedAt)
  const [profile, setProfile] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [full, setFull] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const seconds = activeSeconds(a, now)
  const planned = (a.plannedMinutes ?? 45) * 60
  const remaining = planned - seconds
  const rang = useRef(false)
  useEffect(() => { if (remaining <= 0 && !rang.current && !a.pausedAt) { rang.current = true; chime() } }, [remaining, a.pausedAt])
  useEffect(() => { document.title = a.pausedAt ? 'En pausa · bambú' : `${mmss(Math.max(0, remaining))} · bambú`; return () => { document.title = 'bambú' } }, [remaining, a.pausedAt])
  const patch = (p: Partial<typeof a>) => commit(d => ({ ...d, activeFocus: d.activeFocus ? { ...d.activeFocus, ...p } : null }))
  const pause = (reason: string) => patch({ pausedAt: Date.now(), pauseReason: reason })
  function resume() {
    if (!a.pausedAt) return
    patch({ pausedAt: undefined, pausedMilliseconds: (a.pausedMilliseconds ?? 0) + Date.now() - a.pausedAt, pauses: [...(a.pauses ?? []), { at: a.pausedAt, seconds: Math.round((Date.now() - a.pausedAt) / 1000), reason: a.pauseReason ?? 'otra' }], pauseReason: undefined })
  }
  function finish() { if (a.pausedAt) resume(); patch({ endedAt: Date.now(), phase: 'closing' }) }
  // Laptop: espacio pausa o sigue, F pantalla completa. Solo si no estás escribiendo.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, button')) return
      if (e.key === ' ') { e.preventDefault(); if (a.pausedAt) resume(); else pause('otra') }
      if (e.key === 'f' || e.key === 'F') toggleFull()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })
  useEffect(() => { const on = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', on); return () => document.removeEventListener('fullscreenchange', on) }, [])
  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else if (box.current?.requestFullscreen) void box.current.requestFullscreen().catch(() => setFull(f => !f))
    else setFull(f => !f) // iPhone no deja pantalla completa: se agranda dentro de la página.
  }
  const items = a.micro ?? []
  const done = items.filter(m => m.done).length
  return <div ref={box} className={`fb fb-run ${full ? 'full' : ''} ${a.pausedAt ? 'paused' : ''}`}>
    <section className="d-card fb-card fb-clock-card">
      <div className="fb-label">{a.pausedAt ? `En pausa: ${a.pauseReason}` : remaining > 0 ? 'En el bloque' : 'Se acabó el tiempo'}</div>
      <output className="fb-clock" aria-live="off">{remaining > 0 ? mmss(remaining) : `+${mmss(-remaining)}`}</output>
      <div className="d-bar"><i style={{ width: `${Math.min(100, seconds / planned * 100)}%` }} /></div>
      {a.goal && <p className="fb-goal">Meta: {a.goal}</p>}
      <div className="fb-actions">
        {a.pausedAt ? <button type="button" className="d-btn green wide" onClick={resume}>Seguir</button>
          : <details className="fb-pause"><summary className="d-btn white">Pausa</summary><div className="d-chips">{PAUSE_REASONS.map(r => <button key={r} type="button" onClick={() => pause(r)}>{r}</button>)}</div></details>}
        <button type="button" className="d-btn green" onClick={finish}>Terminar</button>
      </div>
      <button type="button" className="d-link fb-full" onClick={toggleFull}>{full ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>
    </section>
    <section className="d-card fb-card">
      <div className="fb-label">Tareas del bloque · {done} de {items.length}</div>
      <ul className="fb-check">{items.map(m => <li key={m.id}><button type="button" className={m.done ? 'on' : ''} aria-pressed={m.done} onClick={e => { if (!m.done) reward(e.currentTarget); haptic(12); commit(d => toggleItem(d, m.id)) }}><i aria-hidden="true">{m.done ? '✓' : ''}</i><span>{m.text}</span></button></li>)}</ul>
      <form className="fb-add" onSubmit={e => { e.preventDefault(); if (text.trim()) { commit(d => addItem(d, text)); setText(''); onMessage('Agregada al bloque.') } }}>
        <input className="d-input" value={text} maxLength={200} onChange={e => setText(e.target.value)} placeholder="Agregar otra al bloque" />
      </form>
      <details className="d-more"><summary>Sonido para concentrarte</summary>
        <div className="d-chips">{BINAURAL.map(b => <button key={b.id} type="button" className={profile === b.id ? 'on' : ''} onClick={() => setProfile(profile === b.id ? null : b.id)}>{b.label}</button>)}</div>
        {profile && <BinauralAudio key={profile} enabled={!a.pausedAt} beat={BINAURAL.find(b => b.id === profile)!.hz} />}
      </details>
    </section>
  </div>
}

function Closing({ data, commit, onMessage }: Props) {
  const a = data.activeFocus!
  const real = Math.max(1, Math.round(activeSeconds(a, a.endedAt ?? Date.now()) / 60))
  const [score, setScore] = useState(4)
  const [result, setResult] = useState('')
  const items = a.micro ?? []
  const loose = items.filter(m => !m.done && !m.id.startsWith('tarea:')).length
  const [keep, setKeep] = useState(true)
  function save() {
    commit(d => closeBlock(d, { score, result, leftoversToTasks: keep }))
    onMessage(`Bloque guardado: ${real} min.`)
  }
  return <section className="d-card fb-card fb-close">
    <div className="fb-label">Cierre</div>
    <h2 className="fb-title">{real} min de {a.plannedMinutes ?? 45} · {items.filter(m => m.done).length} de {items.length} hechas</h2>
    <ul className="fb-check">{items.map(m => <li key={m.id}><button type="button" className={m.done ? 'on' : ''} aria-pressed={m.done} onClick={e => { if (m.done) playSound('undo'); else reward(e.currentTarget); commit(d => toggleItem(d, m.id)) }}><i aria-hidden="true">{m.done ? '✓' : ''}</i><span>{m.text}</span></button></li>)}</ul>
    <div className="fb-label">¿Qué tan enfocado estuviste?</div>
    <div className="d-seg">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={score === n ? 'on' : ''} aria-pressed={score === n} onClick={() => setScore(n)}>{n}</button>)}</div>
    <input className="d-input" value={result} maxLength={1000} onChange={e => setResult(e.target.value)} placeholder="Qué lograste (opcional)" />
    {loose > 0 && <label className="fb-keep"><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> Mandar a mi lista lo que no terminé ({loose})</label>}
    <button type="button" className="d-btn green wide" onClick={save}>Guardar</button>
    <div className="fb-actions">
      <button type="button" className="d-link" onClick={() => commit(d => ({ ...d, activeFocus: d.activeFocus ? { ...d.activeFocus, endedAt: undefined, phase: 'active' } : null }))}>Volver al bloque</button>
      <button type="button" className="d-link" onClick={() => { if (window.confirm('¿Descartar este bloque sin guardarlo?')) commit(d => ({ ...d, activeFocus: null })) }}>Descartar</button>
    </div>
  </section>
}
