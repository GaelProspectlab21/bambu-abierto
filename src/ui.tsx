import { tabDestination } from './lib/navigation'
import { playSound, type SoundKind } from './lib/sounds'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from './lib/haptic'
import type { Light } from './lib/focusStats'

export function Heading({ eyebrow, title, text, aside }: { eyebrow?: string; title: string; text?: string; aside?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{aside}</div>
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return <div className="tabs" role="tablist" aria-label={label}>{options.map(([key, text]) =>
    <button key={key} type="button" tabIndex={value === key ? 0 : -1} onKeyDown={event => { const next = tabDestination(event.key, options.findIndex(([id]) => id === key), options.length); if (next === null) return; event.preventDefault(); onChange(options[next][0]); const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]'); buttons?.[next]?.focus(); }} role="tab" aria-selected={value === key} className={value === key ? 'tab active' : 'tab'} onClick={event => { onChange(key); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>{text}</button>)}</div>
}

export function Chips<T extends string | number>({ value, options, onChange, label, multiple = false }: { value: T | T[] | undefined; options: [T, string][]; onChange: (v: T) => void; label: string; multiple?: boolean }) {
  const selected = (v: T) => multiple ? Array.isArray(value) && value.includes(v) : value === v
  return <div className="chips" role="group" aria-label={label}>{options.map(([key, text]) =>
    <button key={String(key)} type="button" className={selected(key) ? 'chip on' : 'chip'} aria-pressed={selected(key)} onClick={() => onChange(key)}>{text}</button>)}</div>
}

export function Stepper({ value, onChange, min = 0, max = 500, step = 1, label, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; unit?: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n * 10) / 10))
  return <div className="stepper" role="group" aria-label={label}>
    <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(clamp(value - step))}>−</button>
    <output aria-live="polite"><strong>{value}</strong>{unit && <small>{unit}</small>}</output>
    <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(clamp(value + step))}>+</button>
  </div>
}

const LIGHT_TEXT: Record<Light, string> = { verde: 'Bien', ambar: 'Regular', rojo: 'Flojo' }
export function LightBadge({ light, text }: { light: Light; text?: string }) {
  return <span className={`light light-${light}`}><span aria-hidden="true">{light === 'verde' ? '●' : light === 'ambar' ? '◐' : '○'}</span>{text ?? LIGHT_TEXT[light]}</span>
}

export function Card({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: 'accent' | 'warn' | 'quiet' }) {
  return <section className={`card ${tone ? `card-${tone}` : ''} ${className}`}>{children}</section>
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Un reloj que avanza cada segundo solo mientras el componente está en pantalla. */
export function useNow(active = true, every = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), every)
    return () => window.clearInterval(timer)
  }, [active, every])
  return now
}

/** Campana suave con Web Audio y vibración, sin archivos de sonido. */
/** Fin del bloque: el cuenco y dos campanas. Es alarma, así que suena aunque los premios estén en silencio. */
export function chime() {
  try { navigator.vibrate?.([120, 80, 120]) } catch { /* sin vibración */ }
  playSound('focusEnd', true)
}

/**
 * v11.5: arranque y fin de descanso en el entreno. Antes usaban la campana lenta del bloque
 * (2 s de cuenco): en una serie se sentía tarde. Ahora es "¡va!": madera y campana, corto.
 * Igual que la campana, suena aunque los premios estén en silencio, porque es un aviso.
 */
export function goSignal() {
  try { navigator.vibrate?.(120) } catch { /* sin vibración */ }
  playSound('go', true)
}
/** Los últimos 3 segundos antes de arrancar o de volver a la serie. */
export function countTick() { playSound('count') }

/** Mantiene la pantalla encendida mientras haya una sesión abierta. */
let awakeVideo: HTMLVideoElement | null = null
let awakeUsers = 0
function awakeVideoOn() {
  if (typeof document === 'undefined') return
  if (!awakeVideo) {
    const v = document.createElement('video')
    v.src = 'despierto.mp4'
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.setAttribute('muted', '')
    v.setAttribute('aria-hidden', 'true')
    v.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;pointer-events:none;z-index:-1'
    document.body.appendChild(v)
    awakeVideo = v
  }
  const v = awakeVideo
  const play = () => v.play().catch(() => {
    const retry = () => { void v.play().catch(() => undefined); window.removeEventListener('touchend', retry); window.removeEventListener('click', retry) }
    window.addEventListener('touchend', retry, { once: true })
    window.addEventListener('click', retry, { once: true })
  })
  void play()
}
function awakeVideoOff() {
  if (awakeUsers > 0 || !awakeVideo) return
  awakeVideo.pause()
}

export function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    awakeUsers++
    const native = 'wakeLock' in navigator && window.isSecureContext
    const acquire = () => {
      awakeVideoOn()
      if (native) void navigator.wakeLock.request('screen').then(l => { if (cancelled) void l.release(); else lock.current = l }).catch(() => undefined)
    }
    acquire()
    const again = () => { if (!document.hidden) acquire() }
    document.addEventListener('visibilitychange', again)
    return () => {
      cancelled = true
      awakeUsers = Math.max(0, awakeUsers - 1)
      document.removeEventListener('visibilitychange', again)
      void lock.current?.release().catch(() => undefined)
      lock.current = null
      awakeVideoOff()
    }
  }, [active])
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-copy">{children}</p>
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values), min = Math.min(...values)
  const span = max - min || 1
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ')
  return <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={label}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
}

/** Foto de referencia que alterna posición inicial y final para mostrar el movimiento. */
export function MoveImage({ start, end, alt, similar, size = 'big', drawn = false }: { start: string; end: string; alt: string; similar?: string; size?: 'big' | 'thumb'; drawn?: boolean }) {
  const [frame, setFrame] = useState(0)
  const [paused, setPaused] = useState(false)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setFrame(f => 1 - f), size === 'thumb' ? 1400 : 1100)
    return () => window.clearInterval(timer)
  }, [paused, size])
  // Sin señal y sin la foto en caché: en vez de un hueco roto, un aviso tranquilo.
  if (broken) return size === 'thumb' ? <span className="move-thumb move-broken" aria-hidden="true">·</span>
    : <figure className="move-image"><div className="move-frames move-broken"><span>La imagen no cargó. Sin señal se ve cuando vuelva; la técnica está abajo.</span></div></figure>
  const fail = () => setBroken(true)
  if (size === 'thumb') return <span className="move-thumb" aria-hidden="true"><img src={start} alt="" loading="lazy" onError={fail} className={frame === 0 ? 'on' : ''} /><img src={end} alt="" loading="lazy" onError={fail} className={frame === 1 ? 'on' : ''} /></span>
  return <figure className="move-image">
    <button type="button" className="move-frames" onClick={() => setPaused(!paused)} aria-label={paused ? 'Reanudar animación' : 'Pausar animación'}>
      <img src={start} alt={`${alt}: posición inicial`} loading="lazy" onError={fail} className={frame === 0 ? 'on' : ''} />
      <img src={end} alt={`${alt}: posición final`} loading="lazy" onError={fail} className={frame === 1 ? 'on' : ''} />
      <span className="move-step">{frame === 0 ? '1 · Inicio' : '2 · Final'}{paused ? ' · pausado' : ''}</span>
    </button>
    <figcaption>{similar ? <><strong>Referencia similar.</strong> {similar} </> : null}<small>{drawn ? 'Dibujo técnico de Bambú: cada ángulo sale de la técnica, no de IA.' : 'Foto: Free Exercise DB, dominio público.'}</small></figcaption>
  </figure>
}

export type Celebration = { title: string; text?: string; kind?: 'level' | 'rank' | 'achievement' | 'day' | 'record' | 'streak' | 'meta'; image?: string; count?: number; sound?: SoundKind; extra?: string }
export { soundsOn, setSounds } from './lib/sounds'
export function rewardSound(big = false) { playSound(big ? 'achieve' : 'complete') }
const CELEBRATION_SOUND: Record<NonNullable<Celebration['kind']>, SoundKind> = { level: 'level', rank: 'level', achievement: 'achieve', day: 'day', record: 'record', streak: 'streak', meta: 'feast' }
export function celebrate(detail: Celebration) {
  window.dispatchEvent(new CustomEvent<Celebration>('bambu:celebrate', { detail }))
}

// El confeti sale de la paleta Bambú (antes eran los verdes menta de la v8).
const CONFETTI = ['var(--d-green)', 'var(--d-leaf-2)', 'var(--d-gold)', 'var(--d-orange)', 'var(--d-blue)', 'var(--d-green-ink)']
export function CelebrationLayer() {
  const [queue, setQueue] = useState<(Celebration & { id: number })[]>([])
  useEffect(() => {
    const on = (event: Event) => {
      const detail = (event as CustomEvent<Celebration>).detail
      haptic([30, 40, 60])
      playSound(detail.sound ?? CELEBRATION_SOUND[detail.kind ?? 'achievement'])
      setQueue(q => [...q.slice(-2), { ...detail, id: Date.now() + Math.random() }])
    }
    window.addEventListener('bambu:celebrate', on)
    return () => window.removeEventListener('bambu:celebrate', on)
  }, [])
  const current = queue[0]
  useEffect(() => {
    if (!current) return
    // Una etapa nueva pasa pocas veces: se queda más para que se vea la imagen.
    const timer = window.setTimeout(() => setQueue(q => q.slice(1)), current.kind === 'rank' || current.kind === 'streak' || current.kind === 'meta' ? 5600 : 3200)
    return () => window.clearTimeout(timer)
  }, [current])
  if (!current) return null
  if (current.kind === 'streak') return <StreakMoment c={current} onDone={() => setQueue(q => q.slice(1))} />
  if (current.kind === 'meta') return <MetaMoment c={current} onDone={() => setQueue(q => q.slice(1))} />
  return <div className={`celebration cel-${current.kind ?? 'achievement'}`} role="status" onClick={() => setQueue(q => q.slice(1))}>
    <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={`${current.id}-${i}`} style={{ ['--x' as string]: `${(i * 37) % 100}%`, ['--d' as string]: `${(i % 7) * 70}ms`, ['--r' as string]: `${(i * 53) % 360}deg`, background: CONFETTI[i % CONFETTI.length] }} />)}</div>
    <div className="cel-card">{current.image ? <img className="cel-art" src={current.image} alt="" width="168" height="168" /> : <img src="brote.svg" alt="" width="64" height="76" />}<strong>{current.title}</strong>{current.text && <span>{current.text}</span>}</div>
  </div>
}

/**
 * v12: llegaste a tu energía del día. El plato se llena en 0.8 s al ritmo de la madera (sonido 'feast'),
 * revienta en confeti y Brote festeja. Se gana una vez al día, nunca al azar.
 */
function MetaMoment({ c, onDone }: { c: Celebration; onDone: () => void }) {
  return <div className="meta-moment" role="status" onClick={onDone}>
    <div className="confetti" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ ['--x' as string]: `${(i * 29) % 100}%`, ['--d' as string]: `${800 + (i % 8) * 60}ms`, ['--r' as string]: `${(i * 47) % 360}deg`, background: CONFETTI[i % CONFETTI.length] }} />)}</div>
    <div className="mm-plato" aria-hidden="true">
      <svg viewBox="0 0 120 120" width="190" height="190"><circle cx="60" cy="60" r="50" className="mm-pista" /><circle cx="60" cy="60" r="50" className="mm-llena" pathLength="100" /></svg>
      <img src="brote.svg" alt="" width="104" height="104" />
    </div>
    <strong className="mm-title">{c.title}</strong>
    {c.text && <span className="mm-text">{c.text}</span>}
    {c.extra && <b className="mm-extra">{c.extra}</b>}
    <button type="button" className="primary-button sm-go" onClick={onDone}>¡Vamos!</button>
  </div>
}

/** La racha que crece frente a ti: el número viejo se va, entra el nuevo y el tallo suma un nudo. */
function StreakMoment({ c, onDone }: { c: Celebration; onDone: () => void }) {
  const n = c.count ?? 1
  return <div className="streak-moment" role="status" onClick={onDone}>
    <div className="sm-rays" aria-hidden="true" />
    <div className="sm-flame" aria-hidden="true"><svg viewBox="0 0 24 24" width="96" height="96"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.5 2.6-5.3 3.8-8.8 2 1.4 2.6 3 2.6 4.6 1-1 1.6-2.2 1.8-3.6 2.7 2 4.8 4.9 4.8 8 0 3.5-2.7 6-6.5 6z" /></svg></div>
    <div className="sm-count" aria-hidden="true"><span className="sm-old">{Math.max(0, n - 1)}</span><span className="sm-new">{n}</span></div>
    <strong className="sm-title">{c.title}</strong>
    {c.text && <span className="sm-text">{c.text}</span>}
    <div className="sm-week" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} className={i < Math.min(7, n) ? 'on' : ''} style={{ animationDelay: `${300 + i * 90}ms` }} />)}</div>
    <button type="button" className="primary-button sm-go" onClick={onDone}>Seguir</button>
  </div>
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** "hoy", "ayer", "mañana" o "jue 5 nov" (con año solo si no es el actual). */
export function fmtDay(day: string, today = new Date()): string {
  const d = new Date(`${day}T12:00:00`)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === -1) return 'ayer'
  if (diff === 1) return 'mañana'
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() !== t.getFullYear() ? ` ${d.getFullYear()}` : ''}`
}
