import { BinauralAudio } from './BinauralAudio'
import { clearNfcFromUrl, parseNfc } from './lib/nfc'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { GivenBar } from './GivenBar'
import { verdict } from './lib/measure'

type Result = { ok: boolean; title: string; text: string; open?: boolean }

/**
 * Lo que ves al tocar una etiqueta cuando Safari no tiene sesión: la acción se hace en el
 * servidor con la llave de la etiqueta y aquí solo aparece el resultado. Nada de login.
 */
function NfcQuickAction({ search, onSignIn }: { search: string; onSignIn: () => void }) {
  const [result, setResult] = useState<Result | null>(null)
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current || !supabase) return
    sent.current = true
    const k = new URLSearchParams(search).get('k') ?? ''
    if (!k) {
      setResult({ ok: false, title: 'Esta etiqueta es de antes', text: 'No trae tu llave, por eso Safari te pide entrar. Abre Bambú desde el ícono, ve a Ajustes, copia el enlace nuevo y grábala otra vez.' })
      return
    }
    supabase.functions.invoke('bambu-nfc', { body: { k, search } })
      .then(({ data, error }) => {
        const body = (data ?? null) as Result | null
        if (body?.title) { setResult(body); if (body.ok) clearNfcFromUrl(); return }
        // Con status de error, supabase-js no da el cuerpo en `data`: se lee de la respuesta.
        const ctx = (error as { context?: Response } | null)?.context
        if (ctx?.json) ctx.json().then((b: Result) => setResult(b)).catch(() => setResult({ ok: false, title: 'No se pudo confirmar', text: 'Abre Bambú y revisa tu lectura antes de volver a tocar la etiqueta.' }))
        else setResult({ ok: false, title: 'No se pudo registrar', text: 'Revisa tu señal y vuelve a tocar la etiqueta.' })
      })
      .catch(() => setResult({ ok: false, title: 'No se pudo registrar', text: 'Revisa tu señal y vuelve a tocar la etiqueta.' }))
  }, [search])

  return <main className="nfc-quick">
    <section className={`nfc-quick-card ${result ? (result.ok ? 'ok' : 'bad') : ''}`} role="status" aria-live="polite">
      <img src="/icon.svg" width="44" height="44" alt="" />
      {!result ? <><h1>Registrando</h1><p>Un segundo.</p></> : <>
        <div className="nfc-quick-mark" aria-hidden="true">{result.ok ? '✓' : '!'}</div>
        <h1>{result.title}</h1>
        <p>{result.text}</p>
        {!result.ok && <p className="hint">Revisa el registro en Bambú antes de repetir el toque. Así evitas iniciar otra sesión por accidente.</p>}
        {result.ok && <p className="hint">{result.open ? 'Tu app instalada ya lo tiene: ábrela desde el ícono de bambu.' : 'Ya puedes cerrar esta pestaña.'}</p>}
      </>}
    </section>
    {result?.ok && parseNfc(search)?.tag === 'reading' && <BinauralAudio enabled />}
    {result && <button className="auth-switch" onClick={onSignIn}>Entrar a Bambú aquí en Safari</button>}
  </main>
}

/**
 * La noche sin sesión: Safari abre la etiqueta y aquí mismo se registra con dos controles y una línea.
 * Pide primero con cuánto amaneciste (el servidor lee tu medida de la mañana) y guarda al terminar.
 */
function NightQuick({ search, onSignIn }: { search: string; onSignIn: () => void }) {
  const k = useRef(new URLSearchParams(search).get('k') ?? '')
  const [capacity, setCapacity] = useState(60)
  const [given, setGiven] = useState(60)
  const [touched, setTouched] = useState(false)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'loading' | 'form' | 'saving' | 'done' | 'error'>('loading')
  const [result, setResult] = useState<Result | null>(null)
  const asked = useRef(false)
  useEffect(() => {
    if (asked.current || !supabase) return
    asked.current = true
    clearNfcFromUrl()
    if (!k.current) { setResult({ ok: false, title: 'Esta etiqueta es de antes', text: 'No trae tu llave. Abre Bambú desde el ícono, ve a Ajustes, copia el enlace nuevo y grábala otra vez.' }); setPhase('error'); return }
    supabase.functions.invoke('bambu-nfc', { body: { k: k.current, search, peek: true } })
      .then(({ data }) => {
        const p = (data as { peek?: { capacity: number | null; given: number | null; reflection: string } } | null)?.peek
        if (p?.capacity != null) { setCapacity(p.capacity); setGiven(p.given ?? p.capacity); setTouched(p.given != null) }
        if (p?.reflection) setText(p.reflection)
        setPhase('form')
      })
      .catch(() => setPhase('form'))
  }, [search])
  const v = verdict(capacity, given)
  function save() {
    if (!supabase) return
    setPhase('saving')
    supabase.functions.invoke('bambu-nfc', { body: { k: k.current, search: '?nfc=night', night: { capacity, given, reflection: text } } })
      .then(({ data }) => { const b = data as Result | null; if (b?.title) { setResult(b); setPhase(b.ok ? 'done' : 'form') } else throw new Error('sin respuesta') })
      .catch(() => { setResult({ ok: false, title: 'No se pudo registrar', text: 'Revisa tu señal y vuelve a intentarlo.' }); setPhase('form') })
  }
  return <main className="nfc-quick">
    <section className={`nfc-quick-card night-quick ${phase === 'done' ? 'ok' : ''}`} aria-live="polite">
      <img src="/icon.svg" width="44" height="44" alt="" />
      {phase === 'loading' && <><h1>Tu noche</h1><p>Un segundo.</p></>}
      {phase === 'error' && result && <><h1>{result.title}</h1><p>{result.text}</p></>}
      {phase === 'done' && result && <><div className="nfc-quick-mark" aria-hidden="true">{'✓'}</div><h1>{result.title}</h1><p>{result.text}</p><p className="hint">Ya puedes cerrar esta pestaña. Tu app instalada lo tiene al abrirla.</p></>}
      {(phase === 'form' || phase === 'saving') && <>
        <h1>¿Diste lo que traías?</h1>
        <label className="slider-label">Con cuánto amaneciste<output>{capacity}%</output><input type="range" min="0" max="100" step="5" value={capacity} onChange={e => { const c = Number(e.target.value); setCapacity(c); if (!touched) setGiven(c) }} /></label>
        <label className="slider-label">Cuánto diste de eso<output>{given}%</output><input type="range" min="0" max="100" step="5" value={given} onChange={e => { setGiven(Number(e.target.value)); setTouched(true) }} /></label>
        <GivenBar capacity={capacity} given={given} />
        <p className="verdict">{v.text}</p>
        <textarea className="text-input" rows={2} maxLength={600} value={text} onChange={e => setText(e.target.value)} placeholder="Una línea tuya, si quieres" />
        {result && !result.ok && <p role="alert" className="hint">{result.text}</p>}
        <button className="primary-button wide" disabled={phase === 'saving'} onClick={save}>{phase === 'saving' ? 'Guardando' : 'Guardar mi noche'}</button>
      </>}
    </section>
    <button className="auth-switch" onClick={onSignIn}>Entrar a Bambú aquí en Safari</button>
  </main>
}

export function NfcQuick(props: { search: string; onSignIn: () => void }) {
  const tag = parseNfc(props.search)?.tag
  return tag === 'night' ? <NightQuick {...props} /> : <NfcQuickAction {...props} />
}
