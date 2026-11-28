import { useEffect, useRef, useState } from 'react'
import { ExerciseTimer } from './ExerciseTimer'
import { dateKey, makeId, type Activity, type AppData, type TrainingSet } from './lib/model'
import { imageOf, ladder, SLOT_LABEL, type Exercise } from './lib/exercises'
import { available, personalBest, sessionsOf, setValue, type PlanItem } from './lib/coach'
import { checkValue, footballToAsk, restFor } from './lib/session'
import { haptic } from './lib/haptic'
import { guardarUnaMano, juntarManos, leerUnaMano } from './lib/unaMano'
import { playSound } from './lib/sounds'
import { Card, Chips, MoveImage, Stepper, celebrate, countTick, goSignal, mmss } from './ui'

export type Commit = (update: (d: AppData) => AppData) => void
export type OnMessage = (text: string, undo?: () => void) => void

/** Foto o dibujo técnico del ejercicio, si existe. */
export function ExerciseFigure({ ex, size = 'big' }: { ex: Exercise; size?: 'big' | 'thumb' }) {
  const img = imageOf(ex.id)
  return img ? <MoveImage size={size} start={img.start} end={img.end} alt={ex.name} similar={img.similar} drawn={img.drawn} /> : null
}

/**
 * Registrar una serie. Si el número no cuadra con el ejercicio (5 segundos de agarre, 60
 * lagartijas), pide confirmar antes de guardar: casi siempre es un dedazo.
 */
export function SetLogger({ ex, data, target, commit, onMessage, express = false }: { ex: Exercise; data: AppData; target: number; commit: Commit; onMessage: OnMessage; express?: boolean }) {
  const last = sessionsOf(data, ex.id)[0]?.sets.slice(-1)[0]
  const [stepperValue, setValue] = useState(target)
  const [rir, setRir] = useState<number>(1)
  const [withLoad, setWithLoad] = useState(!!last?.loadKg)
  const [load, setLoad] = useState(last?.loadKg ?? 2)
  const [doubt, setDoubt] = useState<{ value: number; text: string; note?: string } | null>(null)
  useEffect(() => { setValue(target) }, [target])
  useEffect(() => { setDoubt(null) }, [stepperValue])
  const timer = data.activeWorkout?.timer
  const ownTimer = timer?.exercise === ex.id ? timer : undefined
  const unit = ex.mode === 'seconds' ? ' s' : ''
  // v12: una mano a la vez. `primera` guarda la primera mano hasta que llega la segunda.
  const [unaMano, setUnaMano] = useState(() => leerUnaMano(ex))
  const [primera, setPrimera] = useState<number | null>(null)
  useEffect(() => { setUnaMano(leerUnaMano(ex)); setPrimera(null) }, [ex.id]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Primero junta las manos (si toca) y luego guarda la serie completa. */
  function registrar(value = stepperValue) {
    if (value < 1) { save(value); return }
    if (unaMano && primera === null) {
      setPrimera(value); haptic([20, 40, 20]); playSound('sideR')
      onMessage(`Primera mano: ${value}${unit}. Ahora la otra.`)
      return
    }
    if (unaMano && primera !== null) { const j = juntarManos(primera, value, ex.mode === 'seconds' ? 's' : 'reps'); setPrimera(null); save(j.value, false, j.note); return }
    save(value)
  }
  /** `value` viene del cronómetro al pararlo, o del stepper si se anota a mano. */
  function save(value = stepperValue, confirmed = false, note?: string) {
    if (value < 1) { haptic([40, 30, 40]); onMessage(ex.mode === 'seconds' ? 'Anota al menos un segundo.' : 'Anota al menos una repetición.'); return }
    const warning = confirmed ? null : checkValue(ex, value)
    if (warning) { haptic([40, 30, 40]); setDoubt({ value, text: warning, note }); return }
    setDoubt(null)
    const now = Date.now()
    const rest = restFor(ex, data.settings, express)
    const row: TrainingSet = { id: makeId(), day: dateKey(), at: now, exercise: ex.id, ...(ex.mode === 'seconds' ? { seconds: value } : { reps: value }), ...(note ? { note } : {}), rir: ownTimer?.rir ?? rir, ...(ownTimer?.loadKg !== undefined ? { loadKg: ownTimer.loadKg } : withLoad && load > 0 ? { loadKg: load } : {}) }
    commit(d => ({ ...d, sets: [...d.sets, row], activeWorkout: { ...(d.activeWorkout && !d.activeWorkout.endedAt ? d.activeWorkout : { startedAt: now }), timer: undefined, restUntil: now + rest * 1000 } }))
    const best = personalBest(data, ex.id)
    const record = !!best && value > (best.reps ?? best.seconds ?? 0) && (row.loadKg ?? 0) >= (best.loadKg ?? 0)
    if (record) celebrate({ kind: 'record', title: `Récord: ${value}${unit}`, text: `${ex.name}. Antes: ${best.reps ?? best.seconds}.` })
    onMessage(record ? `Récord en ${ex.name}. Descansa ${rest} s.` : `Serie guardada. Descansa ${rest} s.`,
      () => commit(d => ({ ...d, sets: d.sets.filter(s => s.id !== row.id) })))
  }
  return <div className="set-logger">
    {ex.mode === 'seconds' && <ExerciseTimer startedAt={ownTimer?.startedAt} minimum={ex.range[0]} target={Math.min(ex.range[1], Math.max(ex.range[0], target))}
      onStart={() => { if (timer) { onMessage('Ya hay una serie cronometrada. Termínala primero.'); return } const now = Date.now(); commit(d => ({ ...d, activeWorkout: { ...(d.activeWorkout && !d.activeWorkout.endedAt ? d.activeWorkout : { startedAt: now }), timer: { exercise: ex.id, startedAt: now + 3000, rir, ...(withLoad ? { loadKg: load } : {}) } } })) }}
      onStop={seconds => { setValue(seconds); registrar(seconds) }} onCancel={() => commit(d => ({ ...d, activeWorkout: d.activeWorkout ? { ...d.activeWorkout, timer: undefined } : null }))} />}
    <Stepper label={ex.mode === 'seconds' ? 'segundos' : 'repeticiones'} unit={ex.mode === 'seconds' ? 's' : 'reps'} value={stepperValue} onChange={setValue} min={0} max={ex.mode === 'seconds' ? 600 : 200} step={ex.mode === 'seconds' ? 5 : 1} />
    <Chips label="Esfuerzo" value={rir} onChange={setRir} options={[[3, 'Fácil, sobraban 3+'], [1, 'Justo, 1 o 2 más'], [0, 'Al fallo técnico']]} />
    <label className="checkbox-label"><input type="checkbox" checked={withLoad} onChange={e => setWithLoad(e.target.checked)} />Con peso (mochila o libros)</label>
    {withLoad && <Stepper label="kilos" unit="kg" value={load} onChange={setLoad} min={0} max={60} step={0.5} />}
    {doubt && <div className="doubt" role="alert">
      <p>{doubt.text}</p>
      <div className="row-actions"><button type="button" className="secondary-button" onClick={() => save(doubt.value, true, doubt.note)}>Sí, guardar {doubt.value}{unit}</button><button type="button" className="quiet-button" onClick={() => setDoubt(null)}>Corregir</button></div>
    </div>}
    <label className="checkbox-label una-mano"><input type="checkbox" checked={unaMano} onChange={e => { setUnaMano(e.target.checked); guardarUnaMano(ex.id, e.target.checked); setPrimera(null) }} />Una mano a la vez (una sola pesa)</label>
    {unaMano && <p className="una-mano-paso" aria-live="polite">{primera === null ? 'Primero una mano. Al parar, te toca la otra.' : <>Primera mano: <b>{primera}{unit}</b>. Ahora la otra mano.</>}</p>}
    <button className="primary-button wide" disabled={!!timer} onClick={() => registrar()}>{unaMano ? (primera === null ? 'Guardar primera mano' : 'Guardar la otra mano') : 'Guardar serie'} <span>{stepperValue}{unit}</span></button>
  </div>
}

/** Descanso entre series. Suena al terminar y se esconde solo 30 s después. */
export function RestTimer({ data, commit, now, next }: { data: AppData; commit: Commit; now: number; next?: string }) {
  const until = data.activeWorkout?.restUntil
  const remaining = until ? Math.ceil((until - now) / 1000) : 0
  const rang = useRef<number | null>(null)
  const ticked = useRef(0)
  useEffect(() => {
    if (until && remaining > 0 && remaining <= 3 && ticked.current !== remaining) { ticked.current = remaining; countTick() }
    if (until && remaining <= 0 && rang.current !== until && now - until < 5000) { rang.current = until; ticked.current = 0; goSignal() }
  }, [remaining, until, now])
  if (!until || remaining <= -30) return null
  return <div className={`rest-timer ${remaining <= 0 ? 'over' : ''}`} role="timer" aria-live="polite">
    <span>{remaining > 0 ? 'Descanso' : 'A la siguiente serie'}{next && <small>Sigue: {next}</small>}</span><strong>{remaining > 0 ? mmss(remaining) : '¡Ya!'}</strong>
    <button className="quiet-button" onClick={() => commit(d => ({ ...d, activeWorkout: d.activeWorkout ? { ...d.activeWorkout, restUntil: (d.activeWorkout.restUntil ?? Date.now()) + 30000 } : null }))}>+30 s</button>
    <button className="quiet-button" onClick={() => commit(d => ({ ...d, activeWorkout: d.activeWorkout ? { ...d.activeWorkout, restUntil: undefined } : null }))}>Saltar</button>
  </div>
}

function askedFootball(day: string): boolean {
  try { return localStorage.getItem(`bambu.futbol.${day}`) === '1' } catch { return false }
}

/** Nunca registras el fútbol, y sin eso el coach no sabe que tus piernas ya trabajaron. Un toque basta. */
export function FootballAsk({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: OnMessage }) {
  const [, force] = useState(0)
  const day = footballToAsk(data, new Date(), askedFootball, dateKey)
  if (!day) return null
  const answer = (played: boolean) => {
    try { localStorage.setItem(`bambu.futbol.${day}`, '1') } catch { /* Si no se guarda, se vuelve a preguntar: no pasa nada. */ }
    if (played) {
      const row: Activity = { id: makeId(), day, kind: 'football', minutes: 90 }
      commit(d => ({ ...d, activities: [...d.activities, row] }))
      onMessage('Fútbol registrado. El coach ya cuenta tus piernas como trabajadas.', () => commit(d => ({ ...d, activities: d.activities.filter(a => a.id !== row.id) })))
    }
    force(n => n + 1)
  }
  return <Card className="football-ask">
    <span className="eyebrow">FÚTBOL</span>
    <h2>¿Jugaste fútbol {day === dateKey() ? 'hoy' : 'ayer'}?</h2>
    <p className="hint">Con esto el coach sabe cuándo tus piernas están listas.</p>
    <div className="row-actions"><button className="primary-button" onClick={() => answer(true)}>Sí, jugué <span>⚽</span></button><button className="secondary-button" onClick={() => answer(false)}>No hubo</button></div>
  </Card>
}

/** Cambios de ejercicio de hoy (por hueco del plan). Viven en este teléfono y se olvidan mañana. */
export type Swaps = Partial<Record<string, string>>
const swapKey = (day: string) => `bambu.cambios.${day}`
export function loadSwaps(day: string): Swaps {
  try { return JSON.parse(localStorage.getItem(swapKey(day)) ?? '{}') as Swaps } catch { return {} }
}
export function storeSwaps(day: string, swaps: Swaps) {
  try { localStorage.setItem(swapKey(day), JSON.stringify(swaps)) } catch { /* Si no se guarda, el cambio dura hasta recargar. */ }
}

/**
 * Hoy no tienes la mesa, o algo molesta: eliges otra opción del MISMO movimiento con tu equipo.
 * El volumen de la semana se cuida igual porque trabaja los mismos músculos.
 */
export function SwapPicker({ ex, equipment, onPick, onClose }: { ex: Exercise; equipment: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const options = ladder(ex.slot).filter(e => e.id !== ex.id && available(e, equipment))
  return <div className="swap-picker" role="group" aria-label={`Cambiar ${ex.name}`}>
    <p className="hint">{options.length ? 'Mismo movimiento, otra opción con tu equipo:' : 'No hay otra opción de este movimiento con tu equipo. Agrega equipo en Ejercicios o salta este por hoy.'}</p>
    {options.map(o => <button key={o.id} type="button" className="secondary-button swap-option" onClick={() => onPick(o.id)}><span>{o.name}</span><small>{o.level < ex.level ? 'más fácil' : 'más difícil'}</small></button>)}
    <button type="button" className="quiet-button" onClick={onClose}>Dejar como estaba</button>
  </div>
}

export function PlanRow({ item, data, open, onToggle, commit, onMessage, mate, express = false, onSwap }: { item: PlanItem; data: AppData; open: boolean; onToggle: () => void; commit: Commit; onMessage: OnMessage; mate?: string; express?: boolean; onSwap?: (id: string) => void }) {
  const [swapping, setSwapping] = useState(false)
  const { exercise: ex, progression: p } = item
  const today = dateKey()
  const sets = data.sets.filter(s => s.day === today && s.exercise === ex.id).sort((a, b) => a.at - b.at)
  const unit = ex.mode === 'seconds' ? 's' : ''
  const done = sets.length >= item.sets
  const img = imageOf(ex.id)
  return <article className={`plan-row ${done ? 'done' : ''}`}>
    <button className="plan-head" onClick={onToggle} aria-expanded={open}>
      {img ? <span className="plan-visual"><ExerciseFigure ex={ex} size="thumb" /><span className="plan-check mini" aria-hidden="true">{done ? '✓' : sets.length || ''}</span></span> : <span className="plan-check" aria-hidden="true">{done ? '✓' : sets.length || '·'}</span>}
      <span className="plan-name"><strong>{ex.name}</strong><small>{SLOT_LABEL[item.slot]} · {item.sets} {item.sets === 1 ? 'serie' : 'series'} de {ex.range[0]} a {ex.range[1]}{unit}{mate ? ` · con ${mate}` : ''}</small></span>
      <span className="plan-target">{sets.length ? sets.map(s => `${setValue(s)}${unit}`).join(' · ') : p.target.join(' · ') + unit}</span>
    </button>
    {open && <div className="plan-body">
      <ExerciseFigure ex={ex} />
      <p className={`progress-note verdict-${p.verdict}`}>{p.message}</p>
      <SetLogger ex={ex} data={data} express={express} target={p.target[Math.min(sets.length, p.target.length - 1)] ?? ex.range[0]} commit={commit} onMessage={onMessage} />
      {sets.length > 0 && <ul className="set-list">{sets.map((s, i) => <li key={s.id}><span>Serie {i + 1}</span><strong>{setValue(s)}{unit}{s.loadKg ? ` · ${s.loadKg} kg` : ''}</strong><span>{s.rir === 0 ? 'al fallo' : s.rir !== undefined && s.rir >= 3 ? 'fácil' : 'justo'}</span>
        <button className="quiet-button" aria-label={`Borrar serie ${i + 1}`} onClick={() => { const removed = s; commit(d => ({ ...d, sets: d.sets.filter(x => x.id !== removed.id) })); onMessage('Serie borrada.', () => commit(d => ({ ...d, sets: [...d.sets, removed] }))) }}>Borrar</button></li>)}</ul>}
      {onSwap && (swapping ? <SwapPicker ex={ex} equipment={data.settings.equipment} onPick={id => { setSwapping(false); onSwap(id) }} onClose={() => setSwapping(false)} /> : <button type="button" className="quiet-button" onClick={() => setSwapping(true)}>Cambiar ejercicio</button>)}
      <details className="cues"><summary>Técnica</summary><ul>{ex.cues.map(c => <li key={c}>{c}</li>)}</ul>{ex.mistakes.length > 0 && <><strong>Errores comunes</strong><ul>{ex.mistakes.map(c => <li key={c}>{c}</li>)}</ul></>}{ex.caution && <p className="caution">{ex.caution}</p>}</details>
    </div>}
  </article>
}
