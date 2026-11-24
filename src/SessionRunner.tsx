import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { SLOT_LABEL } from './lib/exercises'
import { setValue } from './lib/coach'
import { currentStep, sessionQueue, type Group } from './lib/session'
import { ExerciseFigure, RestTimer, SetLogger, SwapPicker, type Commit, type OnMessage } from './TrainingParts'
import { BroteArt } from './Brote'
import { celebrate, mmss } from './ui'
import { plural } from './lib/text'

/**
 * La sesión guiada: una serie a la vez, como una pregunta por pantalla. Lo que toca sale de
 * lo que ya registraste hoy, así que si cierras la app y vuelves, sigue donde ibas.
 */
export function SessionRunner({ data, commit, onMessage, grouped, express, now, onList, onEnd, onSwap }: {
  data: AppData; commit: Commit; onMessage: OnMessage; grouped: Group[]; express: boolean; now: number; onList: () => void; onEnd: () => void; onSwap?: (slot: string, id: string) => void
}) {
  const [swapping, setSwapping] = useState(false)
  const today = dateKey()
  const [skipped, setSkipped] = useState<string[]>([])
  const live = useMemo(() => grouped.map(g => g.filter(i => !skipped.includes(i.exercise.id))).filter(g => g.length), [grouped, skipped])
  const queue = useMemo(() => sessionQueue(live), [live])
  const { step, done, total } = currentStep(queue, data, today)
  const started = data.activeWorkout?.startedAt ?? now
  const cheered = useRef(false)
  useEffect(() => {
    if (!step && total > 0 && !cheered.current) { cheered.current = true; celebrate({ kind: 'record', title: 'Sesión completa', text: `${plural(total, 'serie', 'series')} en ${Math.max(1, Math.round((now - started) / 60000))} min.` }) }
  }, [step, total, now, started])
  const pct = total ? Math.round(done / total * 100) : 0
  const after = step ? queue.slice(queue.indexOf(step) + 1).find(s => s.item.exercise.id !== step.item.exercise.id || s.set > step.set) : undefined

  return <section className="runner" aria-label="Sesión guiada">
    <div className="runner-top">
      <button type="button" className="runner-back" onClick={onList} aria-label="Ver la lista completa">Lista</button>
      <div className="runner-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${done} de ${plural(total, 'serie', 'series')}`}><span style={{ width: `${pct}%` }} /></div>
      <span className="runner-clock">{mmss((now - started) / 1000)}</span>
    </div>
    <RestTimer data={data} commit={commit} now={now} next={step ? `${step.item.exercise.name}, serie ${step.set}` : undefined} />
    {step ? <article className="runner-card" key={`${step.item.exercise.id}-${step.set}`}>
      <span className="eyebrow">{SLOT_LABEL[step.item.slot].toUpperCase()} · SERIE {step.set} DE {step.item.sets}</span>
      <h2>{step.item.exercise.name}</h2>
      {express && step.item.slot && (() => {
        const mate = live.find(g => g.includes(step.item))?.find(i => i !== step.item)
        return mate ? <p className="pair-note">Superserie: alterna con {mate.exercise.name}. Mientras uno trabaja, el otro descansa.</p> : null
      })()}
      <ExerciseFigure ex={step.item.exercise} />
      <p className={`progress-note verdict-${step.item.progression.verdict}`}>{step.item.progression.message}</p>
      <SetLogger ex={step.item.exercise} data={data} express={express} target={step.item.progression.target[Math.min(step.set - 1, step.item.progression.target.length - 1)] ?? step.item.exercise.range[0]} commit={commit} onMessage={onMessage} />
      <details className="cues"><summary>Técnica</summary><ul>{step.item.exercise.cues.map(c => <li key={c}>{c}</li>)}</ul>{step.item.exercise.caution && <p className="caution">{step.item.exercise.caution}</p>}</details>
      {swapping && onSwap && <SwapPicker ex={step.item.exercise} equipment={data.settings.equipment} onPick={id => { setSwapping(false); onSwap(step.item.slot, id) }} onClose={() => setSwapping(false)} />}
      <div className="runner-foot">
        {onSwap && !swapping && step.set === 1 && <button type="button" className="quiet-button" onClick={() => setSwapping(true)}>Cambiar</button>}
        <button type="button" className="quiet-button" onClick={() => { setSkipped(s => [...s, step.item.exercise.id]); onMessage(`Saltaste ${step.item.exercise.name}. Si te duele, anótalo en el check-in.`) }}>Saltar</button>
        {after && <small>Después: {after.item.exercise.name}</small>}
      </div>
    </article>
      : <article className="runner-card runner-done">
        <BroteArt mood="orgulloso" size={110} />
        <h2>Sesión completa.</h2>
        <p>{data.sets.filter(s => s.day === today).length} series hoy. {doneLine(data, today)}</p>
        <p className="hint">Ahora come algo con proteína y duerme tus horas: ahí es donde crece.</p>
        <button type="button" className="primary-button wide" onClick={onEnd}>Terminar sesión <span>✓</span></button>
      </article>}
  </section>
}

function doneLine(data: AppData, today: string): string {
  const ids = new Set(data.sets.filter(s => s.day === today && setValue(s) > 0).map(s => s.exercise))
  return ids.size ? `En ${ids.size} ${ids.size === 1 ? 'ejercicio' : 'ejercicios'}.` : ''
}
