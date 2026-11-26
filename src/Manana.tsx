import { useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { habitOn } from './lib/jardin'
import { morningHabits, morningQuestion } from './lib/manana'
import { XP } from './lib/xp'
import { haptic } from './lib/haptic'
import { reward } from './juice'
import { rewardSound } from './ui'
import { BroteArt } from './Brote'
import { DuoIcon } from './DuoIcons'
import { Sheet } from './Sheet'

type Commit = (update: (d: AppData) => AppData) => void
const KEY = (day: string) => `bambu.manana.${day}`

export function morningAnswered(day: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY(day)) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
}
function saveAnswered(day: string, ids: string[]) {
  try { localStorage.setItem(KEY(day), JSON.stringify(ids)) } catch { return }
}
export function morningDone(data: AppData, day: string): { done: number; total: number } {
  const list = morningHabits(data)
  return { done: list.filter(h => habitOn(data, h, day)).length, total: list.length }
}

export function MorningSheet({ data, commit, onClose }: { data: AppData; commit: Commit; onClose: () => void }) {
  const today = dateKey()
  const list = morningHabits(data)
  const [answered, setAnswered] = useState<string[]>(() => morningAnswered(today))
  const [step, setStep] = useState(() => { const i = list.findIndex(h => !morningAnswered(today).includes(h.id)); return i < 0 ? list.length : i })
  const h = list[step]
  const yes = list.filter(x => habitOn(data, x, today)).length

  function answer(v: boolean, el: HTMLElement) {
    if (!h) return
    haptic(v ? [12, 30, 12] : 10)
    const on = (data.habits[today] ?? []).includes(h.id)
    if (v && !on) { reward(el, `+${XP.habit} XP`); commit(d => ({ ...d, habits: { ...d.habits, [today]: [...(d.habits[today] ?? []), h.id] } })) }
    if (!v && on) commit(d => ({ ...d, habits: { ...d.habits, [today]: (d.habits[today] ?? []).filter(x => x !== h.id) } }))
    const next = [...new Set([...answered, h.id])]
    setAnswered(next)
    saveAnswered(today, next)
    if (step + 1 >= list.length) rewardSound(true)
    setStep(step + 1)
  }

  return <Sheet title={`Buenos días${data.profile.name ? `, ${data.profile.name}` : ''}`} tall onClose={onClose}>
    <div className="d-bar green"><span style={{ width: `${list.length ? Math.min(step, list.length) / list.length * 100 : 0}%` }} /></div>
    {h ? <div className="d-quiz">
      <BroteArt mood="animo" size={110} />
      <p className="d-eyebrow">Pregunta {step + 1} de {list.length}</p>
      <h2 className="d-quiz-q">{morningQuestion(h)}</h2>
      <div className="d-quiz-answers">
        <button type="button" className="d-big-choice green" onClick={e => answer(true, e.currentTarget)}><DuoIcon name="check" size={40} /><b>Sí</b><small>+{XP.habit} XP</small></button>
        <button type="button" className="d-big-choice red" onClick={e => answer(false, e.currentTarget)}><b className="d-no">×</b><b>No</b><small>Mañana se puede</small></button>
      </div>
      {step > 0 && <button type="button" className="d-link" onClick={() => setStep(step - 1)}>Atrás</button>}
    </div> : <div className="d-quiz">
      <BroteArt mood={yes === list.length ? 'orgulloso' : 'feliz'} size={120} />
      <h2 className="d-quiz-q">{yes === list.length ? '¡Mañana perfecta!' : `${yes} de ${list.length} listos`}</h2>
      <ul className="d-quiz-sum">{list.map(x => { const ok = habitOn(data, x, today); return <li key={x.id} className={ok ? 'ok' : ''}><span>{ok ? '✓' : '×'}</span>{x.label}</li> })}</ul>
      <button type="button" className="d-btn green wide" onClick={onClose}>Listo</button>
      <button type="button" className="d-link" onClick={() => { setStep(0) }}>Cambiar respuestas</button>
    </div>}
  </Sheet>
}
