import { votesOn } from './lib/identity'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AppData } from './lib/model'
import { dateKey } from './lib/model'
import { suggestionsFor, lookOf, type SectionId, type Suggestion } from './lib/companion'
import { broteSays, type Mood } from './lib/brote'
import { talloSays } from './lib/tallo'
import { BroteArt } from './Brote'
import { toggleHabit } from './HabitsPage'
import { haptic } from './lib/haptic'

const KEY = 'bambu.companion'
export function companionOn(): boolean { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export function setCompanionOn(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* se aplica igual en esta sesión */ }
  window.dispatchEvent(new Event('bambu:companion'))
}
const seenKey = (section: string) => `bambu.companion.seen.${dateKey()}.${section}`

const TITLE: Record<string, string> = { base: 'Brote', lector: 'Brote lector', tareas: 'Brote enfocado', habitos: 'Brote de hábitos', noche: 'Brote de noche', historial: 'Brote analista', ajustes: 'Brote mecánico' }

/** La mascota en la esquina: cambia de aspecto con la sección y da sugerencias hechas con tus datos. */
export function Companion({ data, section, go, commit, now, cloud, inline = false }: {
  data: AppData; section: SectionId; go: (s: SectionId) => void; commit: (u: (d: AppData) => AppData) => void; now: number; cloud: boolean; inline?: boolean
}) {
  const panelId = useId()
  const container = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [on, setOn] = useState(companionOn)
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  useEffect(() => { const f = () => setOn(companionOn()); window.addEventListener('bambu:companion', f); return () => window.removeEventListener('bambu:companion', f) }, [])
  useEffect(() => { setOpen(false); try { setSeen(localStorage.getItem(seenKey(section)) === '1') } catch { setSeen(false) } }, [section])
  useEffect(() => {
    if (!open) return
    closeButton.current?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside) }
  }, [open])
  // Nunca tapar una acción: al bajar o al escribir se guarda; al subir vuelve.
  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    if (inline) return
    let last = window.scrollY
    let typing = false
    const onScroll = () => { const y = window.scrollY; if (Math.abs(y - last) < 6) return; if (!typing) setTucked(y > last && y > 80); last = y }
    const onFocus = (e: FocusEvent) => { if (e.target instanceof HTMLElement && e.target.matches('input, textarea, select')) { typing = true; setTucked(true) } }
    const onBlur = () => { typing = false; setTucked(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onBlur) }
  }, [inline])
  // Cuando sumas un voto, Brote brinca y sonríe un segundo: te vio.
  const votes = votesOn(data).total
  const lastVotes = useRef(votes)
  const [cheer, setCheer] = useState(false)
  useEffect(() => {
    if (votes > lastVotes.current) { setCheer(true); setTucked(false); const t = window.setTimeout(() => setCheer(false), 1400); lastVotes.current = votes; return () => window.clearTimeout(t) }
    lastVotes.current = votes
  }, [votes])
  const minute = Math.floor(now / 60000)
  const items = useMemo(() => suggestionsFor(section, data, now, { cloud }), [section, data, minute, cloud]) // eslint-disable-line react-hooks/exhaustive-deps
  const training = section === 'Entrenar'
  const coach = training ? talloSays(data, now) : null
  if (!on || (!training && !items.length)) return null
  const look = lookOf(section)
  const mood: Mood = cheer ? 'orgulloso' : section === 'Hoy' ? broteSays(data, now).mood : look === 'noche' ? 'sueno' : look === 'habitos' ? 'animo' : 'feliz'
  function toggle() {
    haptic()
    setOpen(o => !o)
    if (!seen) { setSeen(true); try { localStorage.setItem(seenKey(section), '1') } catch { /* el punto reaparece, no pasa nada */ } }
  }
  function act(s: Suggestion) {
    if (!s.cta) return
    haptic()
    if ('go' in s.cta) go(s.cta.go)
    else toggleHabit(commit, s.cta.habit)
    setOpen(false)
  }
  return <aside ref={container} className={`companion ${inline ? 'companion-inline' : ''} ${section === 'Noche' ? 'lifted' : ''} ${tucked && !open && !inline ? 'tucked' : ''}`} aria-label={training ? "Sugerencias de Tallo" : "Sugerencias de Brote"}>
    {inline && <span className="companion-label">Un consejo de Brote</span>}
    {open && <div id={panelId} className="companion-panel" role="dialog" aria-label="Sugerencias">
      <header><strong>{training ? 'Tallo, tu entrenador' : TITLE[look]}</strong><button ref={closeButton} className="quiet-button" aria-label="Cerrar consejos" onClick={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }}>×</button></header>
      <ul>{coach && coach.lines.map((line, i) => <li key={`coach-${i}`}><p>{line.text}</p></li>)}{items.map(s => <li key={s.id}><p>{s.text}</p>{s.cta && <button className="secondary-button" onClick={() => act(s)}>{s.cta.label}</button>}</li>)}</ul>
      <button className="quiet-button hide-btn" onClick={() => { setCompanionOn(false); setOpen(false) }}>Ocultar mascota</button>
    </div>}
    <button ref={trigger} aria-controls={open ? panelId : undefined} className={`companion-fab look-${look} ${cheer ? 'cheer' : ''}`} aria-expanded={open} aria-label={open ? 'Cerrar sugerencias' : training ? 'Abrir sugerencias de Tallo' : `Abrir sugerencias de Brote (${items.length})`} onClick={toggle}>
      <>{training ? <img src="img/tallo-guapo.png" width="66" height="72" alt="Tallo presumido" /> : <BroteArt mood={mood} look={look} size={58} />}</>
      {!seen && <i className="companion-dot" aria-hidden="true" />}
    </button>
  </aside>
}
