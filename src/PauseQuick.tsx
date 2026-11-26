import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { clearNfcFromUrl, parseNfc } from './lib/nfc'
import { breathSeconds, PASS_MINUTES, passShortcutUrl, pauseApp, SWAPS } from './lib/pause'
import { nfcServerAction } from './lib/nfcActions'
import { dateKey, type AppData } from './lib/model'

type Result = { ok: boolean; title: string; text: string; locked?: boolean }
type Phase = 'breathe' | 'ask' | 'minutes' | 'saving' | 'pass' | 'swap' | 'locked' | 'error'

/** Cuántas veces abriste la pausa hoy en este Safari. Sin almacenamiento, cuenta como la primera. */
function opensToday(): number {
  const key = `bambu.pause.${new Date().toLocaleDateString('en-CA')}`
  try {
    const n = Number(localStorage.getItem(key) ?? 0)
    localStorage.setItem(key, String(n + 1))
    return n
  } catch { return 0 }
}

/**
 * La pausa antes de una app. Abierta por la automatización de Atajos en Safari, sin sesión: la
 * llave del enlace basta para anotar el resultado en tu cuenta (igual que una etiqueta NFC).
 */
export function PauseQuick({ search, local = null }: { search: string; local?: AppData | null }) {
  const app = pauseApp(parseNfc(search)?.app)
  const k = useRef(new URLSearchParams(search).get('k') ?? '')
  const [need] = useState(() => breathSeconds(opensToday()))
  const [held, setHeld] = useState(0)
  const [phase, setPhase] = useState<Phase>(k.current || local ? 'breathe' : 'error')
  const [result, setResult] = useState<Result | null>(null)
  const [minutes, setMinutes] = useState(10)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const late = (() => { const h = new Date().getHours(); return h >= 22 || h < 5 })()

  useEffect(() => { clearNfcFromUrl(); return () => clearInterval(timer.current) }, [])

  function hold() {
    clearInterval(timer.current)
    const start = Date.now()
    timer.current = setInterval(() => {
      const s = (Date.now() - start) / 1000
      setHeld(s)
      if (s >= need) { clearInterval(timer.current); navigator.vibrate?.(30); setPhase('ask') }
    }, 100)
  }
  function release() { if (phase === 'breathe') { clearInterval(timer.current); setHeld(0) } }

  function send(o: string, then: Phase) {
    if (!supabase || local) {
      const outcome = o === 'r' ? { kind: 'resistida' as const } : { kind: 'pase' as const, minutes: Number(o.slice(1)) }
      const r = local ? nfcServerAction(local, { tag: 'pause', app: app.id, outcome }, Date.now(), dateKey()) : null
      if (r?.locked) { setResult({ ok: true, title: r.title, text: r.text, locked: true }); setPhase('locked'); return }
      setResult({ ok: true, title: r?.title ?? (o === 'r' ? 'Elegiste tu vida real' : 'Entra con intención'), text: r?.text ?? 'Tu decisión cuenta.' }); setPhase(then); return
    }
    setPhase('saving')
    supabase.functions.invoke('bambu-nfc', { body: { k: k.current, search: `?nfc=pause&app=${app.id}&o=${o}` } })
      .then(({ data }) => { const b = data as Result | null; setResult(b?.title ? b : { ok: false, title: 'No se anotó', text: 'Sin señal. Tu decisión cuenta igual.' }); setPhase(b?.locked ? 'locked' : then) })
      .catch(() => { setResult({ ok: false, title: 'No se anotó', text: 'Sin señal. Tu decisión cuenta igual.' }); setPhase(then) })
  }

  const progress = Math.min(1, held / need)
  const inhale = Math.floor(held / 4) % 2 === 0
  return <main className="nfc-quick pause-quick">
    <section className="nfc-quick-card pause-card" aria-live="polite">
      {phase === 'error' && <><h1>Este atajo es de antes</h1><p>El enlace no trae tu llave. Abre Bambú, ve a Ajustes, Pausa antes de las apps, y copia el enlace nuevo en tu atajo.</p></>}

      {phase === 'breathe' && <>
        <p className="pause-eyebrow">Antes de {app.name}</p>
        <h1>Respira conmigo</h1>
        <button type="button" className="pause-orb" style={{ '--p': progress } as React.CSSProperties} data-in={held > 0 && inhale ? '1' : '0'}
          onPointerDown={hold} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onContextMenu={e => e.preventDefault()}
          aria-label={`Mantén presionado ${need} segundos`}>
          <span>{held === 0 ? 'Mantén' : inhale ? 'Inhala' : 'Exhala'}</span>
        </button>
        <p className="hint">{held === 0 ? `Mantén presionado ${need} segundos.` : `${Math.ceil(need - held)} s`}{need > 5 ? ' Hoy ya volviste, por eso dura más.' : ''}</p>
      </>}

      {phase === 'ask' && <>
        <p className="pause-eyebrow">{app.name}</p>
        <h1>¿A qué venías?</h1>
        <div className="pause-choices">
          <button type="button" className="primary-button wide" onClick={() => setPhase('minutes')}>A algo concreto</button>
          <button type="button" className="secondary-button wide" onClick={() => send('r', 'swap')}>Por costumbre o aburrimiento</button>
        </div>
        {late && <p className="hint">Ya es noche. Lo que ves ahorita le quita a tu sueño, y tu sueño es tu crecimiento.</p>}
      </>}

      {phase === 'minutes' && <>
        <h1>¿Cuánto tiempo?</h1>
        <p>Ponle un límite antes de entrar. Cuando se acabe, la pausa vuelve.</p>
        <div className="pause-minutes" role="group" aria-label="Minutos">{PASS_MINUTES.map(m => <button key={m} type="button" className={`chip ${m === minutes ? 'on' : ''}`} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>{m} min</button>)}</div>
        <button type="button" className="primary-button wide" onClick={() => send(`p${minutes}`, 'pass')}>Listo</button>
        <button type="button" className="quiet-button" onClick={() => send('r', 'swap')}>Mejor no entro</button>
      </>}

      {phase === 'saving' && <><h1>Anotando</h1><p>Un segundo.</p></>}

      {phase === 'locked' && result && <>
        <p className="pause-eyebrow">Candado de entreno</p>
        <h1>{result.title}</h1><p>{result.text}</p>
        <a className="primary-button wide" href={`?nfc=training${k.current ? `&k=${encodeURIComponent(k.current)}` : ''}`}>Empezar mi rutina</a>
        <button type="button" className="quiet-button" onClick={() => send('r', 'swap')}>Mejor no entro</button>
        <p className="hint">Cuando registres series, el candado se quita solo.</p>
      </>}

      {phase === 'pass' && result && <>
        <h1>{result.title}</h1><p>{result.text}</p>
        <a className="primary-button wide" href={passShortcutUrl(app, minutes)}>Entrar a {app.name}</a>
        <p className="hint">Si no se abre, crea el atajo Bambú Pase. Los pasos están en Ajustes, Pausa antes de las apps.</p>
      </>}

      {phase === 'swap' && result && <>
        <div className="nfc-quick-mark" aria-hidden="true">✓</div>
        <h1>{result.title}</h1><p>{result.text}</p>
        <p className="pause-eyebrow">Cambia el scroll por</p>
        <ul className="pause-swaps">{SWAPS.map(s => <li key={s.id}>
          {s.id === 'leer' ? <a href={`?nfc=reading&k=${encodeURIComponent(k.current)}`}><strong>{s.title}</strong><small>Arranca tu cronómetro de lectura.</small></a>
            : <div><strong>{s.title}</strong><small>{s.text}</small></div>}
        </li>)}</ul>
        <p className="hint">Ya puedes cerrar esta pestaña.</p>
      </>}
    </section>
  </main>
}
