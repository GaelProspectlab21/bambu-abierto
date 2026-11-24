import { useState } from 'react'
import { foodCheckinAdvice, type FoodCheckinAnswers } from './lib/foodCheckin'
import { Card } from './ui'

const QUESTIONS = [
  { key: 'hunger', title: '¿Cómo anda tu hambre durante el día?', options: [['normal', 'Aparece entre comidas'], ['often', 'Tengo hambre seguido'], ['little', 'Me cuesta sentir hambre']] },
  { key: 'breakfast', title: '¿Sueles desayunar?', options: [['yes', 'Sí'], ['sometimes', 'A veces'], ['no', 'Casi nunca']] },
  { key: 'energy', title: '¿Cómo te sientes cuando juegas o entrenas?', options: [['good', 'Con energía'], ['low', 'Me canso más de lo normal'], ['rest', 'No he entrenado estos días']] },
] as const

export function FoodCheckin() {
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Partial<FoodCheckinAnswers>>({})
  const q = QUESTIONS[step]
  return <Card className="food-checkin">
    {step === -1 ? <><h2>¿Cómo te sientes?</h2><p>Tres preguntas sobre tus comidas y tu energía. No es un diagnóstico.</p><button className="secondary-button" onClick={() => { setAnswers({}); setStep(0) }}>Revisar mis hábitos de comida</button></> : q ? <>
      <small>Pregunta {step + 1} de 3</small><h2>{q.title}</h2>
      <div className="food-checkin-options">{q.options.map(([value, label]) => <button key={value} type="button" className="secondary-button" onClick={() => { setAnswers(a => ({ ...a, [q.key]: value })); setStep(s => s + 1) }}>{label}</button>)}</div>
      <button type="button" className="quiet-button" onClick={() => setStep(s => s - 1)}>{step ? 'Atrás' : 'Cerrar'}</button>
    </> : <><h2>Una idea para hoy</h2><ul>{foodCheckinAdvice(answers as FoodCheckinAnswers).map(line => <li key={line}>{line}</li>)}</ul><p className="hint">Si te preocupa cómo estás creciendo, revísalo con tu pediatra y tu familia. No necesitas calcularlo aquí.</p><button type="button" className="quiet-button" onClick={() => setStep(-1)}>Cerrar</button></>}
  </Card>
}
