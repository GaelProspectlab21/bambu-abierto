import { useState } from 'react'
import type { Modules } from './lib/model'
import { BroteArt } from './Brote'
import { Chips, Stepper } from './ui'
import { FIRST_STEPS, onboardingResult, type OnboardingResult } from './lib/onboarding'
export type { OnboardingResult } from './lib/onboarding'

export function Onboarding({ initialName, onComplete }: { initialName: string; onComplete: (result: OnboardingResult) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initialName)
  const [age, setAge] = useState(13)
  const [modules, setModules] = useState<Modules>({ reading: true, bible: false, training: false, focus: true, food: false })
  const [chosen, setChosen] = useState<string>('agua')
  const [done, setDone] = useState(false)
  const action = FIRST_STEPS.find(a => a.id === chosen)!
  return <main className="ob">
    <header className="ob-top">
      {step > 0 && <button type="button" className="ob-back" aria-label="Atrás" onClick={() => setStep(step - 1)}>←</button>}
      <div className="ob-progress" role="progressbar" aria-label="Tu bienvenida" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div>
      <span className="hint">Paso {step + 1} de 3</span>
    </header>
    <section className="ob-body" key={step}>
      <BroteArt mood={done ? 'orgulloso' : 'feliz'} size={100} />
      {step === 0 && <>
        <h1 className="ob-q">Soy Brote. Vamos con una cosa.</h1>
        <p className="ob-copy">Primero algo pequeño que puedas hacer hoy. Lo demás lo ajustas cuando quieras.</p>
        <label className="field-label">Tu nombre<input className="text-input" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Tu nombre o apodo" /></label>
        <label className="field-label">Tu edad</label><Stepper label="edad" unit="años" value={age} onChange={setAge} min={8} max={99} />
        <details><summary>Elegir mis áreas</summary><p className="hint">Empiezas con Lectura y Enfoque. Puedes cambiarlas en Ajustes.</p>
          <Chips multiple label="Áreas" value={(Object.keys(modules) as (keyof Modules)[]).filter(k => modules[k])} options={[[ 'reading', 'Lectura' ], ['bible', 'Biblia'], ['training', 'Entreno'], ['focus', 'Enfoque'], ['food', 'Comida']]} onChange={k => setModules(m => ({ ...m, [k]: !m[k], ...(k === 'reading' && m.reading ? { bible: false } : {}), ...(k === 'bible' && !m.bible ? { reading: true } : {}) }))} />
        </details>
        <p className="hint">Tu edad adapta las recomendaciones. Si activas Entreno, arrancas con el nivel inicial y sin equipo.</p>
      </>}
      {step === 1 && <>
        <h1 className="ob-q">Una cosa para hoy.</h1>
        <p className="ob-copy">Elige una. Hazla antes de marcarla.</p>
        <div className="ob-options">{FIRST_STEPS.map(a => <button key={a.id} type="button" className={`ob-option ${chosen === a.id ? 'on' : ''}`} aria-pressed={chosen === a.id} onClick={() => { setChosen(a.id); setDone(false) }}>{a.label}</button>)}</div>
        <p className="ob-copy" aria-live="polite">{action.instruction}</p>
        <button type="button" className="primary-button" onClick={() => { setDone(true); setStep(2) }}>Ya lo hice</button>
        <button type="button" className="quiet-button" onClick={() => { setDone(false); setStep(2) }}>Lo haré después</button>
      </>}
      {step === 2 && <>
        <h1 className="ob-q">{done ? 'Un hecho de verdad.' : 'Tu primer paso está claro.'}</h1>
        <p className="ob-copy">{done ? `Al entrar se guarda: ${action.label.toLowerCase()}. Por hoy basta con este primer paso.` : `Hoy empieza con esto: ${action.label.toLowerCase()}. Lo encuentras en Hábitos de hoy.`}</p>
        <p className="hint">Tu norte, tus metas y más hábitos se eligen en Ajustes. Yo te acompaño.</p>
        <button type="button" className="primary-button" onClick={() => onComplete(onboardingResult(name, age, modules, chosen, done))}>Guardar y entrar</button>
      </>}
    </section>
    {step === 0 && <footer className="ob-foot"><button type="button" className="primary-button wide" disabled={!name.trim()} onClick={() => setStep(1)}>Elegir mi primer paso</button></footer>}
  </main>
}
