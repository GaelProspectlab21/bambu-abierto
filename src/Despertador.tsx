import { useEffect, useRef, useState } from 'react'
import { BroteArt } from './Brote'
import { CamaraValor } from './Candado'
import { haptic } from './lib/haptic'
import { playRep, playSound, startAlarm, stopAlarm } from './lib/sounds'
import { useWakeLock } from './ui'

type Fase = 'inicio' | 'camara' | 'falta' | 'manual' | 'listo'
export type ResultadoDesp = { ok: boolean; title: string; text: string }

/** Tiempo mínimo entre toques en el modo sin cámara: diez toques seguidos no son diez lagartijas. */
const RITMO_MS = 1500
const SOLTAR_MS = 3000

/**
 * La pantalla del despertador. La alarma de bambú arranca con tu primer toque (iOS no deja sonar
 * sin un toque) y solo se apaga cuando completas tus lagartijas. La salida existe, pero cuesta:
 * mantener presionado 3 segundos y solo para un día de dolor o enfermedad.
 */
export function DespertadorPantalla({ reps, nombre, onListo, onSalir }: { reps: number; nombre?: string; onListo: (hechas: number) => Promise<ResultadoDesp> | ResultadoDesp; onSalir: () => void }) {
  const [fase, setFase] = useState<Fase>('inicio')
  const [hechas, setHechas] = useState(0)
  const [res, setRes] = useState<ResultadoDesp | null>(null)
  const [soltando, setSoltando] = useState(false)
  const ultimoToque = useRef(0)
  const soltar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [hora, setHora] = useState(() => new Date())
  useWakeLock(fase !== 'listo')
  useEffect(() => { const t = setInterval(() => setHora(new Date()), 15000); return () => clearInterval(t) }, [])
  useEffect(() => () => { stopAlarm(); clearTimeout(soltar.current) }, [])

  const faltan = Math.max(0, reps - hechas)
  function empezar() { haptic([30, 40, 30]); startAlarm(); setFase('camara') }
  async function terminar(total: number) {
    stopAlarm()
    playSound('awake')
    haptic([30, 60, 30, 60, 90])
    setFase('listo')
    setRes({ ok: true, title: 'Guardando', text: 'Un segundo.' })
    try { setRes(await onListo(total)) } catch { setRes({ ok: false, title: 'Lo hiciste, pero no se guardó', text: 'Revisa tu señal. Tus lagartijas sí cuentan para ti.' }) }
  }
  function sumar(v: number) {
    const total = hechas + Math.max(0, Math.round(v))
    setHechas(total)
    if (total >= reps) void terminar(total)
    else setFase('falta')
  }
  function toque() {
    const ahora = Date.now()
    if (ahora - ultimoToque.current < RITMO_MS) { playSound('miss'); return }
    ultimoToque.current = ahora
    const total = hechas + 1
    playRep(total)
    haptic(15)
    setHechas(total)
    if (total >= reps) void terminar(total)
  }
  function apretar() {
    setSoltando(true)
    soltar.current = setTimeout(() => { stopAlarm(); haptic(40); onSalir() }, SOLTAR_MS)
  }
  function aflojar() { setSoltando(false); clearTimeout(soltar.current) }

  const reloj = hora.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  const salida = fase !== 'listo' && <button type="button" className={`desp-salir ${soltando ? 'on' : ''}`}
    onPointerDown={apretar} onPointerUp={aflojar} onPointerLeave={aflojar} onPointerCancel={aflojar}>
    {soltando ? 'Sigue presionando' : 'Hoy no puedo (dolor o enfermedad). Mantén presionado'}
  </button>

  if (fase === 'camara') return <CamaraValor ej="Lagartijas" kind="reps" meta={faltan} autoMeta onValor={sumar} onCerrar={() => setFase('falta')} />
  return <main className={`desp desp-${fase}`}>
    <p className="desp-hora">{reloj}</p>
    <span className={`desp-brote ${fase === 'listo' ? 'arriba' : ''}`}><BroteArt mood={fase === 'listo' ? 'orgulloso' : fase === 'inicio' ? 'sueno' : 'animo'} size={150} /></span>
    {fase === 'inicio' && <>
      <h1>Buenos días{nombre ? `, ${nombre}` : ''}</h1>
      <p>Tu alarma se apaga con {reps} lagartijas frente a la cámara. Pon el teléfono en el piso, frente a tu cabeza.</p>
      <button type="button" className="d-btn green wide desp-cta" onClick={empezar}>Empezar mis {reps}</button>
    </>}
    {fase === 'falta' && <>
      <h1>Te faltan {faltan}</h1>
      <p>Llevas {hechas} de {reps}. La alarma sigue hasta que acabes.</p>
      <button type="button" className="d-btn green wide desp-cta" onClick={() => setFase('camara')}>Seguir con la cámara</button>
      <button type="button" className="d-link" onClick={() => setFase('manual')}>La cámara no me ve</button>
    </>}
    {fase === 'manual' && <>
      <h1>{hechas} de {reps}</h1>
      <p>Toca el botón con la nariz al bajar cada lagartija. Una cada segundo y medio, no más rápido.</p>
      <button type="button" className="desp-tap" onClick={toque} aria-label={`Lagartija ${hechas + 1}`}>{faltan}</button>
      <button type="button" className="d-link" onClick={() => setFase('camara')}>Volver a la cámara</button>
    </>}
    {fase === 'listo' && res && <>
      <h1>{res.title}</h1>
      <p>{res.text}</p>
      <button type="button" className="d-btn green wide desp-cta" onClick={onSalir}>Arrancar mi día</button>
    </>}
    {salida}
  </main>
}
