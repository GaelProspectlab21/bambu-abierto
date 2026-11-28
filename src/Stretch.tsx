import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dateKey, type AppData } from './lib/model'
import { ROUTINES, STRETCH_EVENT, holdCues, logStretch, openStretch, stepsOf, stretchRow, stretchSlot, stretchStreak, stretchedOn, totalSeconds, transitionCue, variedSteps, type StretchWhen } from './lib/stretch'
import { playSound } from './lib/sounds'
import { Card, useWakeLock } from './ui'
import { Icon } from './Icons'
import { haptic } from './lib/haptic'
import { reward } from './juice'
import { StretchPhoto } from './StretchPhoto'
import { BroteArt } from './BroteArt'

type Commit = (update: (d: AppData) => AppData) => void
type Message = (t: string, undo?: () => void) => void

/** Lo monta App una sola vez: escucha `openStretch()` y el enlace `?estirar`. */
export function StretchHost({ data, commit, onMessage, boot }: { data: AppData; commit: Commit; onMessage: Message; boot?: StretchWhen | null }) {
  const [when, setWhen] = useState<StretchWhen | null>(boot ?? null)
  useEffect(() => {
    const on = (e: Event) => setWhen((e as CustomEvent<StretchWhen>).detail)
    window.addEventListener(STRETCH_EVENT, on)
    return () => window.removeEventListener(STRETCH_EVENT, on)
  }, [])
  if (!when) return null
  return <StretchPlayer key={when} when={when} commit={commit} onMessage={onMessage} streak={stretchStreak(data)} onClose={() => setWhen(null)} />
}

/**
 * El reproductor: una postura a la vez, el reloj avanza solo y vibra al cambiar de lado.
 * La pantalla no se apaga mientras estiras. Al terminar se guarda solo; si sales después de
 * dos minutos, también cuenta (lo poco hecho vale más que lo perfecto sin hacer).
 */
export function StretchPlayer({ when, commit, onMessage, streak, onClose, onSaved }: { when: StretchWhen; commit?: Commit; onMessage: Message; streak: number; onClose: () => void; onSaved?: (seconds: number) => void }) {
  const [short, setShort] = useState(false)
  // Completa: unos 8 minutos que cambian cada día. Sin ganas: dos minutos.
  const full = useMemo(() => variedSteps(when), [when])
  const steps = useMemo(() => short ? stepsOf(when, true) : full, [when, short, full])
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(steps[0].seconds)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const elapsed = useRef(0)
  const saved = useRef(false)
  const doneBtn = useRef<HTMLButtonElement>(null)

  // Pantalla encendida mientras estiras (si el teléfono lo permite).
  useWakeLock(started && !done)

  // Reloj por marcas de tiempo: si el teléfono se duerme un momento, no se atrasa.
  useEffect(() => {
    if (!started || paused || done) return
    let last = Date.now()
    const t = window.setInterval(() => {
      const now = Date.now(), d = (now - last) / 1000
      last = now
      elapsed.current += d
      setLeft(l => l - d)
    }, 250)
    return () => window.clearInterval(t)
  }, [started, paused, done, i])

  const prevLeft = useRef(left)
  useEffect(() => {
    if (!started || done) return
    const step = steps[i]
    holdCues(prevLeft.current, left, step.seconds, step.kind).forEach(c => playSound(c))
    prevLeft.current = left
    if (left > 0) return
    if (i + 1 < steps.length) { haptic([30, 60, 30]); playSound(transitionCue(step, steps[i + 1])); prevLeft.current = steps[i + 1].seconds; setI(i + 1); setLeft(steps[i + 1].seconds) }
    else finish()
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') exit() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  function save(seconds: number) {
    if (saved.current) return
    saved.current = true
    if (onSaved || !commit) { onSaved?.(seconds); return }
    const row = stretchRow(when, seconds)
    commit(d => logStretch(d, when, seconds, row.day, row))
    return row
  }
  function finish() {
    setDone(true)
    const row = save(totalSeconds(steps))
    haptic([20, 40, 60])
    playSound('stretchDone')
    window.setTimeout(() => reward(doneBtn.current, '+1 flexibilidad'), 80)
    if (row && commit) onMessage('Estiramiento guardado.', () => commit(d => ({ ...d, activities: d.activities.filter(a => a.id !== row.id) })))
  }
  function exit() {
    if (started && !done && elapsed.current >= 120) {
      const row = save(elapsed.current)
      if (row && commit) onMessage(`${Math.round(elapsed.current / 60)} min de estiramiento guardados. Algo es mucho más que nada.`, () => commit(d => ({ ...d, activities: d.activities.filter(a => a.id !== row.id) })))
    }
    onClose()
  }
  function jump(to: number) { if (to < 0 || to >= steps.length) return; haptic(10); playSound(transitionCue(steps[i], steps[to])); prevLeft.current = steps[to].seconds; setI(to); setLeft(steps[to].seconds) }

  const r = ROUTINES[when]
  const step = steps[i]
  const next = steps[i + 1]
  const pct = Math.max(0, Math.min(1, 1 - left / step.seconds))
  const mins = Math.round(totalSeconds(steps) / 60)

  return createPortal(<div className={`stretch-screen st-${when}`} role="dialog" aria-modal="true" aria-label={`Estiramiento: ${r.title}`}>
    <header className="st-head">
      <button type="button" className="st-close" onClick={exit} aria-label="Salir"><Icon name="cerrar" size={22} /></button>
      {started && !done && <div className="st-dots" aria-hidden="true">{steps.map((_, k) => <i key={k} className={k < i ? 'past' : k === i ? 'now' : ''} />)}</div>}
    </header>

    {!started && <div className="st-intro">
      <span className="st-badge"><Icon name="estirar" size={34} /></span>
      <span className="eyebrow">ESTIRAMIENTO · {r.title.toUpperCase()}</span>
      <h2>{mins} minutos para moverte mejor</h2>
      <p>{r.why}</p>
      <p className="hint">Si duele, para y avisa a un adulto. No fuerces las rodillas ni la espalda baja.</p>
      <p className="hint">{short ? 'Lo mínimo para no romper la racha.' : 'Cambia cada día. El reloj avanza solo y vibra al cambiar.'}</p>
      <ol className="st-list">{[...new Map(steps.map(m => [m.name, m])).values()].map(m => <li key={m.name}><span>{m.name}</span><small>{m.sides ? `${m.seconds} s por lado` : `${m.seconds} s`}</small></li>)}</ol>
      <div className="st-length" role="group" aria-label="Duración">
        <button type="button" className={!short ? 'on' : ''} aria-pressed={!short} onClick={() => { setShort(false); setLeft(full[0].seconds) }}>Completa · {Math.round(totalSeconds(full) / 60)} min</button>
        <button type="button" className={short ? 'on' : ''} aria-pressed={short} onClick={() => { setShort(true); setLeft(stepsOf(when, true)[0].seconds) }}>Sin ganas · 2 min</button>
      </div>
      <button type="button" className="primary-button st-go" onClick={() => { haptic(14); playSound('stretchIn'); prevLeft.current = steps[0].seconds; setStarted(true) }}>Empezar <span>↗</span></button>
      {streak > 1 && <small className="st-streak"><Icon name="racha" size={14} /> {streak} días seguidos estirando</small>}
    </div>}

    {started && !done && <div className="st-play">
      <span className="eyebrow">{i + 1} DE {steps.length}{step.side ? ` · ${step.side.toUpperCase()}` : ''}</span>
      <h2 key={i}>{step.name}</h2>
      <StretchPhoto move={step} />
      <p className="hint">{step.muscle}. {step.why}</p>
      <div className="st-ring" role="timer" aria-label={`${Math.ceil(left)} segundos`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" className="st-ring-bg" /><circle cx="60" cy="60" r="52" className="st-ring-fg" style={{ strokeDasharray: `${pct * 326.7} 326.7` }} /></svg>
        <b>{Math.max(0, Math.ceil(left))}</b>
      </div>
      {step.steps ? <ol className="st-steps">{step.steps.map(x => <li key={x}>{x}</li>)}</ol> : <p className="st-how">{step.how}</p>}
      {step.feel && <p className="st-feel">Lo sientes en {step.feel}. Tensión sí, dolor no.</p>}
      <small>Sin rebotes. Si algo duele, para.</small>
      <p className="st-next">{next ? <>Sigue: <strong>{next.name}{next.side && next.name === step.name ? ', otro lado' : ''}</strong></> : 'Última. Respira largo.'}</p>
      <div className="st-controls">
        <button type="button" className="st-ctl" onClick={() => jump(i - 1)} disabled={i === 0} aria-label="Anterior">‹</button>
        <button type="button" className="st-ctl st-main" onClick={() => { haptic(10); playSound(paused ? 'resume' : 'pause'); setPaused(!paused) }}>{paused ? 'Seguir' : 'Pausa'}</button>
        <button type="button" className="st-ctl" onClick={() => i + 1 < steps.length ? jump(i + 1) : finish()} aria-label="Siguiente">›</button>
      </div>
    </div>}

    {done && <div className="st-done">
      <BroteArt mood="orgulloso" size={132} />
      <h2>Listo. Tu cuerpo te lo agradece.</h2>
      <p>{streak > 1 ? `Van ${streak} días seguidos. La flexibilidad se gana así, poco a poco y diario.` : 'Día uno. La flexibilidad se gana así, poco a poco y diario.'}</p>
      <button ref={doneBtn} type="button" className="primary-button st-go" onClick={onClose}>Cerrar</button>
    </div>}
  </div>, document.body)
}

/**
 * La tarjeta que invita a estirar. En Hoy solo sale a la hora que toca y si todavía no lo hiciste;
 * en Entrenar y en Noche siempre, con las dos rutinas.
 */
export function StretchCard({ data, mode }: { data: AppData; mode: 'hoy' | 'entrenar' | 'noche' }) {
  const today = dateKey()
  const did = stretchedOn(data, today)
  const slot = stretchSlot()
  const streak = stretchStreak(data, today)
  if (mode === 'hoy' && (!slot || did.has(slot))) return null
  const main: StretchWhen = mode === 'noche' ? 'noche' : mode === 'hoy' && slot ? slot : slot ?? 'noche'
  const r = ROUTINES[main]
  const mins = Math.round(totalSeconds(variedSteps(main)) / 60)
  const other: StretchWhen = main === 'noche' ? 'manana' : 'noche'
  return <Card className="stretch-card">
    <button type="button" className="stretch-main" onClick={() => openStretch(main)}>
      <span className="st-badge"><Icon name="estirar" size={26} /></span>
      <span><span className="eyebrow">ESTIRAMIENTO · {r.title.toUpperCase()}</span>
        <strong>{did.has(main) ? 'Hecho hoy. ¿Otra vuelta?' : `${mins} minutos para ${main === 'noche' ? 'cerrar el día' : 'despertar el cuerpo'}`}</strong>
        <small>{streak > 1 ? `${streak} días seguidos estirando` : streak === 1 ? 'Primer día de tu racha estirando' : 'Guiado, con reloj. Solo sigue la pantalla.'}</small></span>
      {did.has(main) ? <i className="st-check"><Icon name="check" size={18} /></i> : <i className="st-play-ico" aria-hidden="true">▶</i>}
    </button>
    {mode !== 'hoy' && <button type="button" className="stretch-other" onClick={() => openStretch(other)}>
      {did.has(other) && <Icon name="check" size={14} />} {ROUTINES[other].title} · {Math.round(totalSeconds(variedSteps(other)) / 60)} min
    </button>}
  </Card>
}
