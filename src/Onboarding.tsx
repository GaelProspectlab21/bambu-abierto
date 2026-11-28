import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { makeId, type HabitDef, type Modules } from './lib/model'
import { BroteArt } from './Brote'
import { haptic } from './lib/haptic'
import { Chips, Stepper, celebrate } from './ui'
import { burst } from './juice'
import type { Mood } from './lib/brote'
import { HORAS_CEL, METAS, compromiso, habitosDe, modulosDe, reporteCel, type Meta } from './lib/bienvenida'
import { playSound } from './lib/sounds'

export type OnboardingResult = {
  name: string; modules: Modules; habits: HabitDef[]; firstVotes: string[]; competir: boolean; age?: number; sinEdad?: boolean
  metas?: Meta[]; wake?: string; despertador?: boolean; deporteDias?: number[]; horasCel?: number
}
type Props = { initialName: string; onComplete: (result: OnboardingResult) => void }

/** Hábitos de ejemplo para elegir. Ninguno es obligatorio: cada quien arma los suyos. */
const CATALOG: { id: string; label: string; mark: string }[] = [
  { id: 'cama', label: 'Tender la cama', mark: 'T' }, { id: 'oracion', label: 'Oración o meditación', mark: 'O' }, { id: 'comida', label: 'Comer comida real', mark: 'C' },
  { id: 'dormir', label: 'Dormir a mi hora', mark: 'D' }, { id: 'estirar', label: 'Estirar', mark: 'E' },
  { id: 'agua', label: 'Tomar agua', mark: 'A' }, { id: 'pantallas', label: 'Sin pantallas antes de dormir', mark: 'P' },
  { id: 'gratitud', label: 'Escribir tres gratitudes', mark: 'G' }, { id: 'ayudar', label: 'Ayudar a alguien', mark: 'Y' },
  { id: 'aprender', label: 'Aprender algo nuevo', mark: 'N' },
]
type Step = 'wake' | 'edad' | 'cel' | 'reporte' | 'metas' | 'deporte' | 'despertar' | 'habits' | 'compromiso' | 'grow'
const DIAS: [number, string][] = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']]
const ESTRELLAS = [[12, 18, 0], [26, 9, 1.1], [41, 22, 2.3], [58, 12, .6], [73, 25, 1.7], [86, 10, 2.9], [92, 30, .3], [18, 34, 2.1], [64, 36, 1.4], [35, 40, 3.2]]
/** El cielo de la bienvenida: estrellas de noche y, con dia, el amanecer que sale cuando despiertas a Brote. */
export function Cielo({ dia = false }: { dia?: boolean }) {
  return <div className={`ob-sky ${dia ? 'dawn' : ''}`} aria-hidden="true">{ESTRELLAS.map(([x, y, d], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}<b className="ob-sun" /></div>
}

/**
 * La bienvenida personalizada (v11): despiertas a Brote, le cuentas de ti en preguntas de un toque,
 * ves tu reporte, eliges qué quieres cambiar (eso enciende los módulos) y te comprometes
 * manteniendo presionado. Modo competir: nombre, edad y metas, y adentro.
 */
export function Onboarding({ initialName, onComplete }: Props) {
  const [step, setStep] = useState<Step>('wake')
  const [mood, setMood] = useState<Mood>('sueno')
  const [name, setName] = useState(initialName)
  const [age, setAge] = useState(13)
  const [sinEdad, setSinEdad] = useState(false)
  const [cel, setCel] = useState('')
  const [metas, setMetas] = useState<Meta[]>([])
  const [modules, setModules] = useState<Modules>(modulosDe([]))
  const [dias, setDias] = useState<number[]>([])
  const [wake, setWake] = useState('06:30')
  const [desp, setDesp] = useState(false)
  const [picked, setPicked] = useState<string[]>(['cama'])
  const [custom, setCustom] = useState('')
  const [ticks, setTicks] = useState(0)
  const [anim, setAnim] = useState<'' | 'despierta'>('')
  const [competir, setCompetir] = useState(false)
  const [firme, setFirme] = useState(0)
  const firmeT = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  // El id del hábito propio se fija una vez: si cambiara en cada pantalla, el primer voto apuntaría a otro.
  const [customId] = useState(() => `h-${makeId().slice(0, 8)}`)
  const flow: Step[] = competir ? ['wake', 'edad', 'metas']
    : ['wake', 'edad', 'cel', 'reporte', 'metas', ...(modules.training ? ['deporte' as Step] : []), 'despertar', 'habits', 'compromiso']
  const index = flow.indexOf(step)
  const go = (next: Step) => { haptic(10); setStep(next) }
  const forward = () => go(flow[index + 1] ?? 'grow')
  const back = () => go(index > 0 ? flow[index - 1] : 'wake')
  const horas = HORAS_CEL.find(h => h.id === cel)?.horas ?? 3
  const rep = reporteCel(horas, sinEdad ? undefined : age)

  function toggleMeta(m: Meta) {
    const next = metas.includes(m) ? metas.filter(x => x !== m) : [...metas, m]
    setMetas(next)
    setModules(modulosDe(next))
    setPicked(habitosDe(next))
  }
  function apretar() {
    clearInterval(firmeT.current)
    haptic(10)
    firmeT.current = setInterval(() => setFirme(f => {
      const n = Math.min(100, f + 5)
      if (n % 25 === 0) haptic(12)
      if (n >= 100) { clearInterval(firmeT.current); playSound('level'); window.setTimeout(() => go('grow'), 350) }
      return n
    }), 90)
  }
  function soltar() { clearInterval(firmeT.current); setFirme(f => f >= 100 ? f : 0) }
  useEffect(() => () => clearInterval(firmeT.current), [])

  const despierto = mood !== 'sueno'
  function wakeUp(e?: MouseEvent) {
    if (despierto) return
    haptic([20, 30, 60])
    const art = (e?.currentTarget as Element | undefined)?.querySelector?.('.brote-art') ?? document.querySelector('.ob-mascot')
    setAnim('despierta')
    setMood('susto')
    window.setTimeout(() => { burst(art, 18); setMood('feliz') }, 650)
    window.setTimeout(() => setAnim(''), 1500)
  }
  const habits = (): HabitDef[] => [
    ...CATALOG.filter(h => picked.includes(h.id)).map(h => ({ id: h.id, label: h.label, mark: h.mark })),
    ...(custom.trim() ? [{ id: customId, label: custom.trim().slice(0, 60), mark: custom.trim().charAt(0).toUpperCase() }] : []),
  ]
  const zonas = [modules.training, modules.focus, modules.reading, modules.food].filter(Boolean).length
  const nombreMetas = METAS.filter(m => metas.includes(m.id)).map(m => m.label.toLowerCase())
  const checklist = competir ? [
    'Modo competir: sin racha obligatoria',
    `${zonas} ${zonas === 1 ? 'zona lista' : 'zonas listas'}`,
    'Tu perfil para la liga: créalo en Amigos',
  ] : [
    nombreMetas.length ? `Tu plan para ${nombreMetas.slice(0, 2).join(' y ')}` : 'Tu plan del día',
    `${habits().length} ${habits().length === 1 ? 'hábito diario' : 'hábitos diarios'}`,
    modules.training ? (dias.length ? `Entreno que respeta tus ${dias.length} ${dias.length === 1 ? 'día' : 'días'} de deporte` : 'Tu entreno de la semana') : 'Sin entreno por ahora',
    desp && modules.training ? `Despertador de lagartijas a las ${wake}` : `Tu hora de despertar: ${wake}`,
  ]
  // "Plantando tu bambú": cada línea se palomea sola y al final entras.
  useEffect(() => {
    if (step !== 'grow') return
    if (ticks >= checklist.length) {
      const t = window.setTimeout(() => {
        if (competir) celebrate({ kind: 'rank', title: `¡A competir${name.trim() ? `, ${name.trim()}` : ''}!`, text: 'Agrega a tus amigos en Amigos y reta a quien quieras.', image: 'img/rango-02-brote.svg' })
        else celebrate({ kind: 'rank', title: `Ya echaste raíz${name.trim() ? `, ${name.trim()}` : ''}.`, text: 'Tu bambú ya está plantado. Lo que repites echa raíces.', image: 'img/rango-02-brote.svg' })
        onComplete({ name: name.trim(), modules, habits: competir ? [] : habits(), firstVotes: [], competir, age: sinEdad ? undefined : age, sinEdad: sinEdad || undefined,
          metas, wake, despertador: desp && modules.training, deporteDias: dias, horasCel: cel ? horas : undefined })
      }, 500)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => { haptic(12); setTicks(n => n + 1) }, 330)
    return () => window.clearTimeout(t)
  }, [step, ticks]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'wake') return <main className={`ob ob-wake ${despierto ? 'awake' : 'asleep'}`} onClick={despierto ? undefined : wakeUp}>
    <Cielo />
    <button type="button" className={`ob-mascot ${anim}`} onClick={wakeUp} aria-label={despierto ? 'Brote despierto' : 'Despertar a Brote'}><BroteArt mood={mood} size={176} /></button>
    {!despierto ? <>
      <h1 className="ob-title">Toca para despertar</h1>
      <span className="ob-tap" aria-hidden="true" />
    </> : mood === 'susto' ? <h1 className="ob-title">¡Ay!</h1> : <div className="ob-hola">
      <h1 className="ob-title">¡Hola! Soy Brote.</h1>
      <p className="ob-copy">Te ayudo a ver qué haces con tus días, sin llenar formularios. ¿Cómo te llamas?</p>
      <input className="text-input ob-input" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Tu nombre" aria-label="Tu nombre" onKeyDown={e => { if (e.key === 'Enter' && name.trim()) forward() }} />
      <button type="button" className="primary-button ob-cta" disabled={!name.trim()} onClick={forward}>Continuar <span>→</span></button>
      <p className="ob-note">Gratis. Tus respuestas se quedan contigo.</p>
    </div>}
  </main>

  const primero = name.trim().split(/\s+/)[0] || ''
  const puedeSeguir = step === 'cel' ? !!cel : step === 'metas' ? metas.length > 0 || competir : true
  return <main className="ob ob-fondo">
    <Cielo dia />
    {step !== 'grow' && <header className="ob-top">
      <button type="button" className="ob-back" onClick={back} aria-label="Atrás">←</button>
      <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={flow.length} aria-valuenow={index + 1} aria-label={`Paso ${index + 1} de ${flow.length}`}><span style={{ width: `${(index + 1) / flow.length * 100}%` }} /></div>
    </header>}
    <section className="ob-body" key={step}>
      {step === 'edad' && <>
        <span className="ob-mini"><BroteArt mood="calma" size={84} /></span>
        <h1 className="ob-q">¿Cuántos años tienes{primero ? `, ${primero}` : ''}?</h1>
        <p className="ob-copy">Con esto ajusto tu entreno y tu comida a tu edad. No sale de tu cuenta.</p>
        <Stepper label="Edad" unit="años" value={age} min={8} max={99} onChange={n => { setAge(n); setSinEdad(false) }} />
        <button type="button" className="d-link ob-saltar" onClick={() => { setSinEdad(true); forward() }}>Prefiero no decirla</button>
      </>}
      {step === 'cel' && <>
        <span className="ob-mini"><BroteArt mood="animo" size={84} /></span>
        <h1 className="ob-q">¿Cuánto tiempo pasas en el cel al día?</h1>
        <p className="ob-copy">Sin juzgar. Si no sabes, búscalo en Ajustes del iPhone, Tiempo en pantalla.</p>
        <div className="ob-options">{HORAS_CEL.map(h => <button key={h.id} type="button" className={`ob-option ${cel === h.id ? 'on' : ''}`} aria-pressed={cel === h.id} onClick={() => { haptic(8); setCel(h.id) }}><strong>{h.label}</strong></button>)}</div>
      </>}
      {step === 'reporte' && <div className="ob-reporte">
        <span className="ob-mini"><BroteArt mood="calma" size={84} /></span>
        <h1 className="ob-q">Tu reporte{primero ? `, ${primero}` : ''}</h1>
        <p className="ob-copy">Si sigues igual hasta los 80, son</p>
        <p className="ob-big"><b>{rep.anos.toLocaleString('es-MX')}</b> años</p>
        <p className="ob-copy">de tu vida mirando una pantalla.</p>
        <p className="ob-good">La buena: con <b>una hora menos al día</b> recuperas <b>{rep.recuperas.toLocaleString('es-MX')} años</b> para lo que sí quieres. Para eso es bambú.</p>
      </div>}
      {step === 'metas' && <>
        <span className="ob-mini"><BroteArt mood="feliz" size={84} /></span>
        <h1 className="ob-q">¿Qué quieres cambiar?</h1>
        <p className="ob-copy">Elige las que quieras. Con eso armo tu app, sin cosas que no vas a usar.</p>
        <div className="ob-options">{METAS.map(m => <button key={m.id} type="button" className={`ob-option big ${metas.includes(m.id) ? 'on' : ''}`} aria-pressed={metas.includes(m.id)} onClick={() => { haptic(8); toggleMeta(m.id) }}>
          <strong>{m.label}</strong><small>{m.text}</small></button>)}</div>
        <button type="button" role="switch" aria-checked={competir} className={`ob-switch ${competir ? 'on' : ''}`} onClick={() => { haptic(10); setCompetir(c => !c); if (!competir) setModules(x => ({ ...x, training: true })) }}>
          <span><strong>Solo competir con mis amigos</strong><small>Sin racha ni objetivos diarios. Entrenas, retas y subes en la liga.</small></span><i aria-hidden="true" />
        </button>
      </>}
      {step === 'deporte' && <>
        <span className="ob-mini"><BroteArt mood="animo" size={84} /></span>
        <h1 className="ob-q">¿Qué días juegas fútbol u otro deporte?</h1>
        <p className="ob-copy">Esos días te toca menos pierna para que llegues fresco al partido.</p>
        <Chips multiple label="Días de deporte" value={dias} onChange={d => setDias(x => x.includes(d) ? x.filter(y => y !== d) : [...x, d])} options={DIAS} />
        <button type="button" className="d-link ob-saltar" onClick={() => { setDias([]); forward() }}>No hago deporte</button>
      </>}
      {step === 'despertar' && <>
        <span className="ob-mini"><BroteArt mood="sueno" size={84} /></span>
        <h1 className="ob-q">¿A qué hora te quieres despertar?</h1>
        <p className="ob-copy">Tu cama y tus avisos se acomodan a esta hora.</p>
        <input className="text-input ob-input ob-hora" type="time" value={wake} onChange={e => e.target.value && setWake(e.target.value)} aria-label="Hora de despertar" />
        {modules.training && <button type="button" role="switch" aria-checked={desp} className={`ob-switch ${desp ? 'on' : ''}`} onClick={() => { haptic(10); setDesp(d => !d) }}>
          <span><strong>Que mis lagartijas me despierten</strong><small>La alarma de bambú solo se apaga cuando la cámara cuenta 10. Lo terminas de armar en Ajustes.</small></span><i aria-hidden="true" />
        </button>}
      </>}
      {step === 'habits' && <>
        <span className="ob-mini"><BroteArt mood="animo" size={84} /></span>
        <h1 className="ob-q">Tus hábitos de cada día</h1>
        <p className="ob-copy">{metas.length ? 'Te marqué los que van con tus metas. Quita o agrega los que quieras.' : 'Elige los tuyos o escribe uno. Ninguno es obligatorio.'}</p>
        <Chips multiple label="Hábitos" value={picked} onChange={id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} options={CATALOG.map(h => [h.id, h.label] as [string, string])} />
        <input className="text-input" value={custom} onChange={e => setCustom(e.target.value)} maxLength={60} placeholder="¿Alguno propio? Ej. Tocar guitarra" />
      </>}
      {step === 'compromiso' && <div className="ob-compromiso">
        <span className="ob-mini"><BroteArt mood="orgulloso" size={96} /></span>
        <h1 className="ob-q">Tu compromiso</h1>
        <blockquote>{compromiso(primero)}</blockquote>
        <p className="ob-copy">Bambú no mide cuánto produces. Mide si diste lo que traías.</p>
        <button type="button" className={`ob-firma ${firme >= 100 ? 'listo' : ''}`} style={{ ['--firme' as string]: `${firme}%` }}
          onPointerDown={apretar} onPointerUp={soltar} onPointerLeave={soltar} onPointerCancel={soltar} onContextMenu={e => e.preventDefault()}>
          <span>{firme >= 100 ? 'Hecho' : firme > 0 ? 'Sigue presionando' : 'Mantén presionado para comprometerte'}</span>
        </button>
      </div>}
      {step === 'grow' && <div className="ob-grow">
        <span className="ob-seed grown"><BroteArt mood="orgulloso" size={170} /></span>
        <h1 className="ob-q">{competir ? 'Preparando tu zona' : 'Plantando tu bambú'}</h1>
        <ul className="ob-checklist">{checklist.map((c, i) => <li key={c} className={i < ticks ? 'done' : ''}><i aria-hidden="true">{i < ticks ? '✓' : ''}</i>{c}</li>)}</ul>
      </div>}
    </section>
    {step !== 'grow' && step !== 'compromiso' && <footer className="ob-foot">
      <button type="button" className="primary-button wide" disabled={!puedeSeguir} onClick={forward}>{index === flow.length - 1 ? 'Listo' : step === 'reporte' ? 'Quiero recuperarlos' : 'Continuar'} <span>→</span></button>
    </footer>}
  </main>
}
