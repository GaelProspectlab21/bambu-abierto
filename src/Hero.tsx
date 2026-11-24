import { useMemo } from 'react'
import { activeHabits, dateKey, type AppData } from './lib/model'
import { game } from './lib/gamification'
import type { Step } from './lib/nextStep'
import { habitDone } from './HabitsPage'
import { haptic } from './lib/haptic'
import type { SectionId } from './lib/companion'
import { plural } from './lib/text'

type Commit = (update: (d: AppData) => AppData) => void

/** Tres tallos de bambú de fondo: da identidad a lo primero que ves sin estorbar el texto. */
function Stalks() {
  const seg = (x: number, h: number, n: number) => Array.from({ length: n }, (_, i) => <rect key={`${x}-${i}`} x={x} y={150 - (i + 1) * h} width="16" height={h - 3} rx="6" />)
  return <svg className="hero-stalks" viewBox="0 0 120 160" aria-hidden="true" focusable="false">
    <g>{seg(8, 26, 5)}</g><g>{seg(52, 30, 4)}</g><g>{seg(94, 22, 6)}</g>
    <path d="M60 36C48 34 44 22 44 22c10 0 16 6 16 14Zm0 0c4-12 16-14 16-14 0 10-8 14-16 14Z" />
  </svg>
}

export function Hero({ data, step, now, go, commit, onMessage }: { data: AppData; step: Step; now: number; go: (s: SectionId) => void; commit: Commit; onMessage: (t: string) => void }) {
  const today = dateKey(new Date(now))
  const hour = new Date(now).getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const minute = Math.floor(now / 60000)
  const g = useMemo(() => game(data, today), [data, today, minute]) // eslint-disable-line react-hooks/exhaustive-deps
  const row = data.checkins.find(c => c.day === today)
  const habits = activeHabits(data.settings)
  const doneHabits = habits.filter(h => habitDone(data, h, today)).length
  const askCapacity = row?.capacity === undefined && hour < 19
  function setCapacity(capacity: number) {
    commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== today), { ...(d.checkins.find(c => c.day === today) ?? { id: today, day: today }), id: today, day: today, capacity }] }))
    haptic()
    onMessage(capacity <= 40 ? `Hoy traes ${capacity}%. Da todo ese ${capacity}% y el día es tuyo.` : `Hoy traes ${capacity}%. Esa es tu medida.`)
  }
  const date = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(now))
  return <section className={`hero ${step.done ? 'is-rest' : ''}`} aria-label="Tu día">
    <Stalks />
    <div className="hero-top">
      <div><span className="hero-date">{date}</span>
        <h1>{greeting}{data.profile.name ? `, ${data.profile.name}` : ''}.</h1></div>
      {habits.length > 0 && <div className="hero-habits" role="img" aria-label={`${doneHabits} de ${plural(habits.length, 'hábito', 'hábitos')}`}><b>{doneHabits}<small>/{habits.length}</small></b><span>hábitos</span></div>}
    </div>
    {askCapacity && step.id === 'checkin'
      ? <div className="hero-step"><span className="hero-eyebrow">{step.eyebrow}</span><h2>{step.title}</h2><p>{step.text}</p></div>
      : <div className="hero-step"><span className="hero-eyebrow">{step.eyebrow}</span><h2>{step.title}</h2><p>{step.text}</p>
        {step.go && step.cta && <button className="hero-cta" onClick={() => { if (step.id === 'meal') { try { sessionStorage.setItem('bambu.openMeal', '1') } catch { /* abre Comida igual */ } } go(step.go as SectionId) }}>{step.cta} <span aria-hidden="true">↗</span></button>}</div>}
    {askCapacity && <div className="hero-measure" role="group" aria-label="Con cuánto amaneciste">
      {step.id !== 'checkin' && <span className="hero-eyebrow">TU MEDIDA DE HOY</span>}
      <div className="hero-chips">{[20, 40, 60, 80, 100].map(n => <button key={n} onClick={() => setCapacity(n)}>{n}%</button>)}</div>
    </div>}
    {/* Misiones del día: una barra con su número. Lo demás (nivel, racha) vive arriba, sin repetirse. */}
    <button type="button" className="hero-quests" onClick={() => document.querySelector('.game-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label={`Misiones de hoy: ${g.questsDone} de ${g.quests.length}`}>
      <span className="hq-label">{g.dayComplete ? 'Misiones de hoy completas' : 'Misiones de hoy'}</span>
      <span className="hq-bar" aria-hidden="true">{g.quests.map(q => <i key={q.id} className={q.done ? 'on' : ''} />)}</span>
      <b>{g.questsDone}/{g.quests.length}</b>
      {row?.capacity !== undefined && <span className="hq-measure">tu medida {row.capacity}%</span>}
    </button>
  </section>
}
