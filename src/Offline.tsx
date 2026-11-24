import { useEffect, useRef, useState } from 'react'
import { BroteArt } from './Brote'
import { haptic } from './lib/haptic'

/** Hay red según el teléfono. No es garantía de llegar a la nube, pero sí avisa al instante cuando se va. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

/**
 * Sin señal: una franja que no asusta. Dice qué pasa con tus datos y ofrece algo útil mientras
 * vuelve: respirar con Brote. Nada se pierde y nada se bloquea.
 */
export function OfflineBanner({ pending, cloud }: { pending: number; cloud: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="offline-banner" onClick={() => setOpen(true)} aria-label="Sin señal. Toca para ver qué pasa con tus datos.">
      <BroteArt mood="sinSenal" size={40} />
      <span><strong>Sin señal.</strong> {cloud ? (pending ? `${pending} ${pending === 1 ? 'cambio espera' : 'cambios esperan'} aquí y suben solos.` : 'Todo lo que hagas se guarda aquí.') : 'Bambú sigue igual: todo vive en este teléfono.'}</span>
      <i aria-hidden="true">Respira</i>
    </button>
    {open && <BreatheSheet pending={pending} cloud={cloud} onClose={() => setOpen(false)} />}
  </>
}

const PHASES = [['Inhala', 4], ['Sostén', 4], ['Exhala', 4], ['Sostén', 4]] as const
const ROUNDS = 4

/** Respiración en caja: 4 tiempos para inhalar, sostener, exhalar y sostener. Cuatro vueltas, un minuto. */
export function BreatheSheet({ pending, cloud, onClose }: { pending: number; cloud: boolean; onClose: () => void }) {
  const [tick, setTick] = useState(-1)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (tick < 0) return
    if (tick >= ROUNDS * 16) { haptic([30, 60, 30]); return }
    const t = window.setTimeout(() => setTick(n => n + 1), 1000)
    if (tick % 4 === 0) haptic(12)
    return () => window.clearTimeout(t)
  }, [tick])
  const running = tick >= 0 && tick < ROUNDS * 16
  const finished = tick >= ROUNDS * 16
  const phase = running ? PHASES[Math.floor(tick / 4) % 4] : null
  const count = running ? 4 - (tick % 4) : 0
  const scale = !phase ? 1 : phase[0] === 'Inhala' ? 1 + (tick % 4 + 1) * 0.1 : phase[0] === 'Exhala' ? 1.4 - (tick % 4 + 1) * 0.1 : Math.floor(tick / 4) % 4 === 1 ? 1.4 : 1
  return <div className="sheet-backdrop" role="presentation" onClick={onClose}>
    <section className="breathe-sheet" role="dialog" aria-modal="true" aria-label="Sin señal" onClick={e => e.stopPropagation()}>
      <button ref={close} type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">✕</button>
      <span className="eyebrow">SIN SEÑAL</span>
      <h2>{finished ? 'Listo. Un minuto ganado.' : 'Nada se perdió.'}</h2>
      <p className="hint">{cloud ? (pending ? `Tienes ${pending} ${pending === 1 ? 'cambio' : 'cambios'} guardados en este teléfono. Cuando vuelva la señal suben solos, no tienes que hacer nada.` : 'Sigue registrando normal. Cuando vuelva la señal, Bambú se pone al día solo.') : 'Bambú funciona sin internet: todo vive en este teléfono.'}</p>
      <div className="breathe" aria-live="polite">
        <div className="breathe-orb" style={{ transform: `scale(${scale})` }}><BroteArt mood={finished ? 'orgulloso' : running ? 'calma' : 'sinSenal'} size={92} /></div>
        <p className="breathe-label">{running ? <><strong>{phase![0]}</strong> {count}</> : finished ? 'Volviste a ti. La señal llegará cuando llegue.' : 'Mientras vuelve, respira conmigo un minuto.'}</p>
      </div>
      {!running && <button type="button" className="primary-button wide" onClick={() => setTick(0)}>{finished ? 'Otra vez' : 'Respirar 1 minuto'} <span>◌</span></button>}
      {running && <button type="button" className="quiet-button" onClick={() => setTick(-1)}>Parar</button>}
    </section>
  </div>
}
