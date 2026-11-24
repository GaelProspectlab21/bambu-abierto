import { useEffect, useRef } from 'react'
import { elapsedSeconds, timerCues } from './lib/exerciseTimer'
import { chime, mmss, useNow, useWakeLock } from './ui'

type Props = { startedAt?: number; minimum: number; target: number; onStart: () => void; onStop: (seconds: number) => void; onCancel: () => void }
export function ExerciseTimer({ startedAt, minimum, target, onStart, onStop, onCancel }: Props) {
  const now = useNow(!!startedAt, 100)
  const previous = useRef(0)
  const stopped = useRef(false)
  const seconds = startedAt ? elapsedSeconds(startedAt, now) : 0
  const countdown = startedAt ? Math.max(0, Math.ceil((startedAt - now) / 1000)) : 0
  useWakeLock(!!startedAt)
  useEffect(() => { previous.current = 0; stopped.current = false }, [startedAt])
  useEffect(() => {
    if (!startedAt || countdown) return
    if (timerCues(previous.current, seconds, minimum, target).length) {
      try { chime(); navigator.vibrate?.(100) } catch { /* Aviso opcional. */ }
    }
    previous.current = seconds
  }, [startedAt, countdown, seconds, minimum, target])
  return <section className="exercise-timer" aria-label="Cronómetro de la serie">
    <svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="70" /><circle className="timer-progress" cx="80" cy="80" r="70" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(100, seconds / Math.max(1, target) * 100)} /></svg>
    <div className="timer-face"><strong role="timer">{countdown || mmss(seconds)}</strong><span>{countdown ? 'Ponte en posición' : `Meta: ${target} s`}</span></div>
    {!startedAt ? <button type="button" className="primary-button" onClick={onStart}>Iniciar · 3 s para acomodarte</button>
      : <><button type="button" className="primary-button" disabled={countdown > 0} onClick={() => { if (stopped.current) return; const value = elapsedSeconds(startedAt, Date.now()); if (value < 1) return; stopped.current = true; onStop(value) }}>Parar y guardar serie</button><button type="button" className="quiet-button" onClick={onCancel}>Cancelar cronómetro</button></>}
  </section>
}
