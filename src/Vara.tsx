import { useEffect, useRef, useState } from 'react'
import { dateKey, type AppData, type Checkin } from './lib/model'
import { ANCHOR_QUESTIONS, gutCheck, promiseCount, promiseKept, suggestPromises, varaOf, type Anchors, type DayPromise } from './lib/vara'
import { haptic } from './lib/haptic'
import { BroteArt } from './Brote'
import { GivenBar } from './GivenBar'
import { Card, Chips, celebrate } from './ui'

type Commit = (update: (d: AppData) => AppData) => void

/**
 * Botón de mantener presionado: una promesa no se sella con un toque distraído.
 * Se llena en `ms`; si sueltas antes, se vacía. Con teclado, Enter sostenido también cuenta.
 */
export function HoldButton({ label, done, onDone, ms = 1200, disabled = false }: { label: string; done: string; onDone: () => void; ms?: number; disabled?: boolean }) {
  const [p, setP] = useState(0)
  const [sealed, setSealed] = useState(false)
  const raf = useRef<number | null>(null)
  const start = useRef(0)
  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; if (!sealed) setP(0) }
  const tick = () => {
    const next = Math.min(1, (performance.now() - start.current) / ms)
    setP(next)
    if (next >= 1) { raf.current = null; setSealed(true); haptic([30, 50, 90]); onDone(); return }
    raf.current = requestAnimationFrame(tick)
  }
  const begin = () => { if (disabled || sealed || raf.current) return; haptic(15); start.current = performance.now(); raf.current = requestAnimationFrame(tick) }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])
  return <button type="button" className={`hold-button ${sealed ? 'sealed' : ''}`} disabled={disabled}
    onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin() } }} onKeyUp={stop}
    onContextMenu={e => e.preventDefault()} aria-label={sealed ? done : `${label}. Mantén presionado.`}>
    <span className="hold-fill" style={{ width: `${p * 100}%` }} aria-hidden="true" />
    <span className="hold-text">{sealed ? done : p > 0 ? 'Sigue presionando' : label}</span>
    <span aria-hidden="true">{sealed ? '✓' : '→'}</span>
  </button>
}

function saveRow(commit: Commit, day: string, patch: Partial<Checkin>) {
  commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== day), { ...(d.checkins.find(c => c.day === day) ?? { id: day, day }), ...patch, id: day, day }] }))
}

/** En la mañana: con tu capacidad, de 1 a 3 promesas concretas. Se marcan solas durante el día. */
export function PromiseCard({ data, commit }: { data: AppData; commit: Commit }) {
  const today = dateKey()
  const row = data.checkins.find(c => c.day === today)
  const capacity = row?.capacity
  const [picked, setPicked] = useState<DayPromise[]>([])
  const [free, setFree] = useState('')
  const [editing, setEditing] = useState(false)
  if (capacity === undefined) return null
  const max = promiseCount(capacity)
  const promises = row?.promises ?? []
  if (promises.length && !editing) {
    const kept = promises.filter(p => promiseKept(p, data, today)).length
    return <Card className="promise-card sealed-card">
      <div className="section-heading"><div><span className="eyebrow">TU PROMESA DE HOY</span><h2>{kept === promises.length ? 'Cumpliste lo que prometiste.' : `${kept} de ${promises.length} cumplidas`}</h2></div>
        <button type="button" className="quiet-button" onClick={() => { setPicked(promises); setEditing(true) }}>Cambiar</button></div>
      <ul className="promise-list">{promises.map(p => {
        const ok = promiseKept(p, data, today)
        return <li key={p.id} className={ok ? 'kept' : ''}>
          {p.kind === 'free'
            ? <button type="button" className="promise-check" aria-pressed={ok} onClick={() => saveRow(commit, today, { promises: promises.map(x => x.id === p.id ? { ...x, done: !ok || undefined } : x) })}>{ok ? '✓' : ''}</button>
            : <span className="promise-check" aria-hidden="true">{ok ? '✓' : ''}</span>}
          <span>{p.label}</span>{p.kind !== 'free' && <small>{ok ? 'tus registros lo confirman' : 'se marca solo'}</small>}
        </li>
      })}</ul>
    </Card>
  }
  // Pocas opciones: con 8 a las 7 de la mañana nadie decide. Lo elegido siempre se queda a la vista.
  const options = [...suggestPromises(data, capacity).slice(0, 5), ...picked.filter(p => p.kind !== 'free')].filter((p, i, all) => all.findIndex(x => x.id === p.id) === i)
  const toggle = (p: DayPromise) => setPicked(list => list.some(x => x.id === p.id) ? list.filter(x => x.id !== p.id) : list.length >= max ? list : [...list, p])
  const addFree = () => {
    const label = free.trim().slice(0, 120)
    if (!label || picked.length >= max) return
    setPicked(list => [...list, { id: `free:${Date.now()}`, kind: 'free', label }])
    setFree('')
  }
  return <Card className="promise-card">
    <span className="eyebrow">TU PROMESA DE HOY</span>
    <h2>Con {capacity}%, {max === 1 ? 'promete una cosa' : `promete ${max} cosas`}.</h2>
    <p className="hint">Concretas y que se puedan comprobar. En la noche, esto es tu vara: no lo que sientas, lo que cumpliste.</p>
    <div className="promise-options">{options.map(p => {
      const on = picked.some(x => x.id === p.id)
      return <button type="button" key={p.id} className={`promise-option ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && picked.length >= max} onClick={() => toggle(p)}>{p.label}</button>
    })}</div>
    {picked.filter(p => p.kind === 'free').map(p => <p key={p.id} className="promise-free">{p.label} <button type="button" className="quiet-button" onClick={() => setPicked(l => l.filter(x => x.id !== p.id))}>Quitar</button></p>)}
    {picked.length < max && <div className="promise-own"><input className="text-input" value={free} maxLength={120} onChange={e => setFree(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFree() }} placeholder="Otra, con tus palabras" aria-label="Escribe otra promesa" /><button type="button" className="secondary-button" onClick={addFree} disabled={!free.trim()}>Agregar</button></div>}
    <HoldButton label={picked.length ? `Prometer ${picked.length === 1 ? 'esto' : `estas ${picked.length}`}` : 'Elige qué prometes'} done="Prometido" disabled={!picked.length}
      onDone={() => { saveRow(commit, today, { promises: picked }); setEditing(false); celebrate({ kind: 'achievement', title: 'Prometido.', text: 'Bambú lo va marcando solo. En la noche, los hechos hablan.' }) }} />
  </Card>
}

/** En la noche: la vara con hechos. Reemplaza al deslizador de "cuánto diste". */
export function VaraCard({ data, day, capacity, anchors, felt, onAnchors, onFelt, onToggleFree }: {
  data: AppData; day: string; capacity: number; anchors: Anchors; felt: number | undefined
  onAnchors: (a: Anchors) => void; onFelt: (v: number | undefined) => void; onToggleFree: (id: string) => void
}) {
  const row = data.checkins.find(c => c.day === day)
  const promises = row?.promises ?? []
  const v = varaOf({ capacity, promises, anchors }, data, day)
  const gut = gutCheck(felt, v.given, v)
  return <Card className="vara-card">
    <span className="eyebrow">TU VARA DE HOY</span>
    {promises.length ? <>
      <h2>Prometiste {promises.length === 1 ? 'una cosa' : `${promises.length} cosas`}. Cumpliste {v.kept}.</h2>
      <ul className="promise-list">{promises.map(p => {
        const ok = promiseKept(p, data, day)
        return <li key={p.id} className={ok ? 'kept' : ''}>
          {p.kind === 'free' ? <button type="button" className="promise-check" aria-pressed={ok} onClick={() => onToggleFree(p.id)}>{ok ? '✓' : ''}</button> : <span className="promise-check" aria-hidden="true">{ok ? '✓' : ''}</span>}
          <span>{p.label}</span>{p.kind !== 'free' && !ok && <small>tus registros no lo muestran</small>}
        </li>
      })}</ul>
    </> : <><h2>Hoy no hubo promesa en la mañana.</h2><p className="hint">La vara de hoy sale solo de tus tres respuestas. Mañana promete al despertar y será exacta.</p></>}
    <div className="anchors">{ANCHOR_QUESTIONS.map(q => <div key={q.id} className="anchor-q">
      <p><strong>{q.text}</strong><small>{q.hint}</small></p>
      <Chips label={q.text} value={anchors[q.id] === undefined ? undefined : anchors[q.id] ? 'si' : 'no'} onChange={x => onAnchors({ ...anchors, [q.id]: x === 'si' })} options={[['si', 'Sí'], ['no', 'No']]} />
    </div>)}</div>
    {v.given !== null && v.answered === ANCHOR_QUESTIONS.length ? <>
      <GivenBar capacity={capacity} given={v.given} />
      <details className="felt" open={felt !== undefined}><summary>¿Y qué dice tu cabeza?</summary>
        <label className="slider-label">Siento que di<output>{felt !== undefined ? `${felt}%` : 'mueve la barra'}</output>
          <input type="range" min="0" max="100" step="5" value={felt ?? capacity} onChange={e => onFelt(Number(e.target.value))} /></label>
        {gut ? <p className="gut">{gut}</p> : felt !== undefined && <p className="hint">Tu cabeza y los hechos están de acuerdo.</p>}
      </details>
    </> : <div className="vara-wait"><BroteArt mood="calma" size={56} /><p>Responde las tres y te digo cuánto diste. Sale de hechos, no de cómo te sientes ahorita.</p></div>}
  </Card>
}
