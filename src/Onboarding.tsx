import { useEffect, useState } from 'react'
import { makeId, type HabitDef, type Modules } from './lib/model'
import { BroteArt } from './Brote'
import { HoldButton } from './Vara'
import { haptic } from './lib/haptic'
import { Chips, Stepper, celebrate } from './ui'
import { reward } from './juice'
import type { Mood } from './lib/brote'

export type OnboardingResult = { name: string; north: string; modules: Modules; habits: HabitDef[]; age: number; footballDays: number[]; weeklyFocusGoal?: number; firstVotes: string[]; trainingLevel?: number; equipment?: string[] }
type Props = { initialName: string; onComplete: (result: OnboardingResult) => void }

/** Hábitos de ejemplo para elegir. Ninguno es obligatorio: cada quien arma los suyos. */
const CATALOG: { id: string; label: string; mark: string; on?: boolean }[] = [
  { id: 'oracion', label: 'Oración o meditación', mark: 'O' }, { id: 'comida', label: 'Comer comida real', mark: 'C', on: true },
  { id: 'dormir', label: 'Dormir a mi hora', mark: 'D', on: true }, { id: 'estirar', label: 'Estirar', mark: 'E', on: true },
  { id: 'agua', label: 'Tomar agua', mark: 'A' }, { id: 'pantallas', label: 'Sin pantallas antes de dormir', mark: 'P' },
  { id: 'gratitud', label: 'Escribir tres gratitudes', mark: 'G' }, { id: 'ayudar', label: 'Ayudar a alguien', mark: 'Y' },
  { id: 'aprender', label: 'Aprender algo nuevo', mark: 'N' },
]
const MODULES: { key: keyof Modules; label: string; text: string }[] = [
  { key: 'reading', label: 'Lectura', text: 'Racha y minutos. Cinco minutos cuentan como día leído.' },
  { key: 'bible', label: 'Biblia', text: 'Tus capítulos, dentro de Lectura.' },
  { key: 'training', label: 'Entreno en casa', text: 'Coach de fuerza sin aparatos, pensado para jóvenes principiantes.' },
  { key: 'focus', label: 'Enfoque y tareas', text: 'Bloques de trabajo profundo y tus pendientes.' },
  { key: 'food', label: 'Comida', text: 'Registra lo que comes en segundos. Proteína, platos completos y tu progreso.' },
]
const NORTHS = ['alguien constante', 'alguien sereno', 'alguien que sirve a los demás', 'alguien fuerte por dentro y por fuera']
/** Lo que de verdad cambia tu rutina: desde qué escalón arrancas y con qué cuentas en casa. */
const LEVELS: [number, string, string][] = [[1, 'Ninguna o casi', 'Arrancas con versiones en pared y silla'], [2, 'De 1 a 5', 'Arrancas con rodillas apoyadas'], [3, 'De 6 a 15', 'Arrancas con la versión normal'], [4, 'Más de 15', 'Arrancas con variantes más duras']]
const GEAR: [string, string][] = [['silla', 'Silla'], ['mochila', 'Mochila con peso'], ['libros', 'Libros'], ['toalla', 'Toalla'], ['mesa', 'Mesa firme'], ['paralelas', 'Mini paralelas'], ['barra', 'Barra de puerta']]

type Step = 'wake' | 'name' | 'north' | 'modules' | 'body' | 'focus' | 'habits' | 'vara' | 'plant' | 'first' | 'grow'
/** Horas de enfoque a la semana: la meta la pone cada quien, no la de quien hizo la app. */
const FOCUS_GOALS: [number, string, string][] = [[60, '1 h', 'Para empezar'], [180, '3 h', 'Constante'], [300, '5 h', 'En serio'], [540, '9 h', 'Modo bestia']]

/**
 * La bienvenida: una pregunta por pantalla, Brote reacciona y al final se planta el bambú
 * manteniendo presionado. Inspirada en el ritual de Clucky: comprometerse se siente, no se clica.
 */
export function Onboarding({ initialName, onComplete }: Props) {
  const [step, setStep] = useState<Step>('wake')
  const [mood, setMood] = useState<Mood>('sueno')
  const [name, setName] = useState(initialName)
  const [north, setNorth] = useState('')
  const [modules, setModules] = useState<Modules>({ reading: true, bible: false, training: false, focus: true, food: false })
  const [age, setAge] = useState(16)
  const [level, setLevel] = useState(0)
  const [gear, setGear] = useState<string[]>(['silla', 'mochila', 'libros', 'toalla'])
  const [picked, setPicked] = useState<string[]>(CATALOG.filter(h => h.on).map(h => h.id))
  const [custom, setCustom] = useState('')
  const [ticks, setTicks] = useState(0)
  const [focusGoal, setFocusGoal] = useState(180)
  const [first, setFirst] = useState<string[]>([])
  // El id del hábito propio se fija una vez: si cambiara en cada pantalla, el primer voto apuntaría a otro.
  const [customId] = useState(() => `h-${makeId().slice(0, 8)}`)
  const flow: Step[] = ['name', 'north', 'modules', ...(modules.training ? ['body' as Step] : []), ...(modules.focus ? ['focus' as Step] : []), 'habits', 'vara', 'plant', ...(picked.length || custom.trim() ? ['first' as Step] : [])]
  const index = flow.indexOf(step)
  const toggle = (k: keyof Modules) => setModules(m => ({ ...m, [k]: !m[k], ...(k === 'reading' && m.reading ? { bible: false } : {}), ...(k === 'bible' && !m.bible ? { reading: true } : {}) }))
  const go = (next: Step) => { haptic(10); setStep(next) }
  const forward = () => go(flow[index + 1] ?? 'grow')
  const back = () => go(index > 0 ? flow[index - 1] : 'wake')

  function wake() {
    if (mood !== 'sueno') return
    haptic([20, 30, 60])
    setMood('susto')
    window.setTimeout(() => setMood('feliz'), 700)
  }
  const habits = (): HabitDef[] => [
    ...CATALOG.filter(h => picked.includes(h.id)).map(h => ({ id: h.id, label: h.label, mark: h.mark })),
    ...(custom.trim() ? [{ id: customId, label: custom.trim().slice(0, 60), mark: custom.trim().charAt(0).toUpperCase() }] : []),
  ]
  const checklist = [
    `${Object.values(modules).filter(Boolean).length} ${Object.values(modules).filter(Boolean).length === 1 ? 'módulo listo' : 'módulos listos'}`,
    `${habits().length} ${habits().length === 1 ? 'hábito' : 'hábitos'} para marcar`,
    north.trim() ? `Tu norte: ${north.trim()}` : 'Tu norte, cuando lo tengas',
    first.length ? `${first.length === 1 ? 'Tu primer hecho' : `${first.length} hechos`} de hoy` : 'Tu primer hecho, cuando hagas algo',
  ]
  // "Plantando tu bambú": cada línea se palomea sola y al final entras.
  useEffect(() => {
    if (step !== 'grow') return
    if (ticks >= checklist.length) {
      const t = window.setTimeout(() => {
        celebrate({ kind: 'rank', title: `Ya echaste raíz${name.trim() ? `, ${name.trim()}` : ''}.`, text: first.length ? `${first.length === 1 ? 'Tu primer hecho ya cuenta' : `${first.length} hechos ya cuentan`}. Lo que repites echa raíces.` : 'Tu bambú ya está plantado. Lo que repites echa raíces.', image: '/img/rango-02-brote.webp' })
        onComplete({ name: name.trim(), north: north.trim(), modules, habits: habits(), age, footballDays: [], ...(modules.training && level ? { trainingLevel: level } : {}), ...(modules.training ? { equipment: ['nada', 'pared', ...gear] } : {}), ...(modules.focus ? { weeklyFocusGoal: focusGoal } : {}), firstVotes: first })
      }, 700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => { haptic(12); setTicks(n => n + 1) }, 520)
    return () => window.clearTimeout(t)
  }, [step, ticks]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'wake') return <main className="ob ob-wake" onClick={wake}>
    <button type="button" className="ob-mascot" onClick={wake} aria-label={mood === 'sueno' ? 'Despertar a Brote' : 'Brote despierto'}><BroteArt mood={mood} size={200} /></button>
    <h1 className="ob-title">{mood === 'sueno' ? 'Toca para despertar' : mood === 'susto' ? '¡Ay!' : '¡Hola! Soy Brote.'}</h1>
    {mood === 'feliz' && <>
      <p className="ob-copy">Te ayudo a ver qué haces con tus días, sin llenar formularios. Te toma un minuto.</p>
      <button type="button" className="primary-button ob-cta" onClick={e => { e.stopPropagation(); go('name') }}>Empezar <span>→</span></button>
      <p className="ob-note">Gratis. Tus respuestas se quedan en este teléfono.</p>
    </>}
  </main>

  const canGo = (step !== 'name' || name.trim().length > 0) && (step !== 'body' || level > 0)
  return <main className="ob">
    {step !== 'grow' && <header className="ob-top">
      <button type="button" className="ob-back" onClick={back} aria-label="Atrás">←</button>
      <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={flow.length} aria-valuenow={index + 1} aria-label={`Paso ${index + 1} de ${flow.length}`}><span style={{ width: `${(index + 1) / flow.length * 100}%` }} /></div>
    </header>}
    <section className="ob-body" key={step}>
      {step === 'name' && <>
        <BroteArt mood="feliz" size={110} />
        <h1 className="ob-q">¿Cómo te llamas?</h1>
        <input className="text-input ob-input" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Tu nombre" onKeyDown={e => { if (e.key === 'Enter' && name.trim()) forward() }} />
      </>}
      {step === 'north' && <>
        <BroteArt mood="animo" size={110} />
        <h1 className="ob-q">¿En quién te quieres convertir?</h1>
        <p className="ob-copy">Es tu norte. Cada cosa buena que haces y registras es un hecho a favor de esa persona.</p>
        <div className="ob-options">{NORTHS.map(n => <button key={n} type="button" className={`ob-option ${north === n ? 'on' : ''}`} aria-pressed={north === n} onClick={() => setNorth(north === n ? '' : n)}>{n}</button>)}</div>
        <input className="text-input" value={NORTHS.includes(north) ? '' : north} onChange={e => setNorth(e.target.value)} maxLength={140} placeholder="O escríbelo con tus palabras" />
      </>}
      {step === 'modules' && <>
        <h1 className="ob-q">¿Qué quieres medir?</h1>
        <p className="ob-copy">Enciende solo lo que vas a usar. Lo demás no aparece. Lo cambias cuando quieras.</p>
        <div className="ob-options">{MODULES.map(m => <button key={m.key} type="button" className={`ob-option big ${modules[m.key] ? 'on' : ''}`} aria-pressed={modules[m.key]} onClick={() => toggle(m.key)}>
          <strong>{m.label}</strong><small>{m.text}</small></button>)}</div>
      </>}
      {step === 'body' && <>
        <h1 className="ob-q">Armemos tu entreno</h1>
        <p className="ob-copy">Con esto tu coach elige desde dónde empiezas. Lo ajusta solo conforme registras.</p>
        <label className="field-label">Tu edad</label>
        <Stepper label="edad" unit="años" value={age} onChange={setAge} min={8} max={99} />
        <label className="field-label">¿Cuántas lagartijas seguidas te salen hoy?</label>
        <div className="ob-options ob-levels">{LEVELS.map(([n, label, text]) => <button key={n} type="button" className={`ob-option ${level === n ? 'on' : ''}`} aria-pressed={level === n} onClick={() => setLevel(n)}><strong>{label}</strong><small>{text}</small></button>)}</div>
        <label className="field-label">¿Con qué cuentas en casa?</label>
        <Chips multiple label="Equipo" value={gear} onChange={g => setGear(x => x.includes(g) ? x.filter(y => y !== g) : [...x, g])} options={GEAR} />
        <p className="hint">Sin nada también se puede: el piso y una pared bastan para empezar.</p>
      </>}
      {step === 'focus' && <>
        <h1 className="ob-q">¿Cuánto enfoque a la semana?</h1>
        <p className="ob-copy">Tiempo de trabajo profundo, sin celular. Empieza bajo: subirla después se siente mejor que no llegar.</p>
        <div className="ob-options ob-goals">{FOCUS_GOALS.map(([min, label, text]) => <button key={min} type="button" className={`ob-option big ${focusGoal === min ? 'on' : ''}`} aria-pressed={focusGoal === min} onClick={() => setFocusGoal(min)}><strong>{label}</strong><small>{text}</small></button>)}</div>
      </>}
      {step === 'habits' && <>
        <h1 className="ob-q">Tus hábitos</h1>
        <p className="ob-copy">Una marca vacía significa «sin dato», no «fallaste».</p>
        <Chips multiple label="Hábitos" value={picked} onChange={id => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} options={CATALOG.map(h => [h.id, h.label] as [string, string])} />
        <input className="text-input" value={custom} onChange={e => setCustom(e.target.value)} maxLength={60} placeholder="¿Alguno propio? Ej. Tocar guitarra" />
      </>}
      {step === 'vara' && <>
        <h1 className="ob-q">Así funciona tu vara</h1>
        <ol className="ob-steps">
          <li><b>1</b><div><strong>En la mañana</strong><span>Dices con cuánto amaneciste y prometes de una a tres cosas.</span></div></li>
          <li><b>2</b><div><strong>Durante el día</strong><span>Lo que registras marca tus promesas solo.</span></div></li>
          <li><b>3</b><div><strong>En la noche</strong><span>Los hechos dicen si diste lo que traías. No tu cansancio.</span></div></li>
        </ol>
        <p className="hint">Con 40% de energía, cumplir una cosa vale tanto como un día de cien.</p>
      </>}
      {step === 'plant' && <>
        <img className="ob-seed" src="/img/rango-01-semilla.webp" alt="" width="180" height="180" />
        <h1 className="ob-q">Planta tu bambú</h1>
        <p className="ob-copy">El bambú pasa años echando raíces antes de crecer. Así funciona la constancia.</p>
        <HoldButton label="Mantén presionado para plantar" done="Plantado" onDone={() => window.setTimeout(() => go(flow.includes('first') ? 'first' : 'grow'), 400)} />
      </>}
      {step === 'first' && <>
        <BroteArt mood="animo" size={110} />
        <h1 className="ob-q">¿Ya hiciste alguno hoy?</h1>
        <p className="ob-copy">Márcalo y es tu primer hecho. Si no, no pasa nada: mañana empiezas.</p>
        <div className="ob-options ob-first">{habits().map(h => <button key={h.id} type="button" className={`ob-option ${first.includes(h.id) ? 'on' : ''}`} aria-pressed={first.includes(h.id)} onClick={e => { haptic(14); if (!first.includes(h.id)) reward(e.currentTarget); setFirst(f => f.includes(h.id) ? f.filter(x => x !== h.id) : [...f, h.id]) }}>{first.includes(h.id) ? '✓ ' : ''}{h.label}</button>)}</div>
      </>}
      {step === 'grow' && <div className="ob-grow">
        <img className="ob-seed grown" src="/img/rango-02-brote.webp" alt="" width="200" height="200" />
        <h1 className="ob-q">Plantando tu bambú</h1>
        <ul className="ob-checklist">{checklist.map((c, i) => <li key={c} className={i < ticks ? 'done' : ''}><i aria-hidden="true">{i < ticks ? '✓' : ''}</i>{c}</li>)}</ul>
      </div>}
    </section>
    {!['plant', 'grow'].includes(step) && <footer className="ob-foot">
      <button type="button" className="primary-button wide" disabled={!canGo} onClick={forward}>{step === 'north' && !north.trim() ? 'Saltar por ahora' : step === 'first' ? (first.length ? 'Listo' : 'Hoy no, empiezo mañana') : 'Continuar'} <span>→</span></button>
    </footer>}
  </main>
}
