import { dateKey, modulesOf, type AppData } from './lib/model'
import { pieDe } from './lib/pieDePagina'
import { acceptIdea, habitAdvice, skipIdea } from './lib/habitCoach'
import { habitDone } from './HabitsPage'
import { BroteArt } from './Brote'
import { reward } from './juice'
import { haptic } from './lib/haptic'

type Commit = (update: (d: AppData) => AppData) => void

/**
 * Al pie de la página, pequeño y al final: un día un versículo, otro una cita de alguien que vivió lo mismo.
 * Sin módulo Biblia, solo citas.
 */
export function PageVerse({ page, data }: { page: string; data: AppData }) {
  const p = pieDe(page, dateKey(), modulesOf(data.settings).bible)
  if (!p) return null
  return <figure className={`page-verse ${p.kind}`}>
    <blockquote>{p.text}</blockquote>
    <figcaption>{p.kind === 'verso' ? p.ref : <><b>{p.who}</b> · {p.source}</>}</figcaption>
  </figure>
}

/** Apretar tuercas: Brote propone un hábito nuevo cada dos semanas, solo si ya sostienes los tuyos. */
export function HabitNudge({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: (t: string, undo?: () => void) => void }) {
  const advice = habitAdvice(data, (h, d) => !!habitDone(data, h, d))
  if (!advice) return null
  const pct = Math.round(advice.adherence * 100)
  if (advice.kind === 'tighten') return <section className="nudge-card" aria-label="Brote te sugiere">
    <BroteArt mood="animo" size={56} />
    <div>
      <small>APRETAR TUERCAS</small>
      <h3>Antes de sumar, afianza «{advice.weakest.label}»</h3>
      <p>Cumpliste {pct}% de tus hábitos en dos semanas. Uno nuevo ahora se comería a los que ya tienes. Esta semana, solo ese, a la misma hora.</p>
      <div className="nudge-actions"><button type="button" className="quiet-button" onClick={() => commit(d => skipIdea(d, null))}>Entendido</button></div>
    </div>
  </section>
  const { idea } = advice
  return <section className="nudge-card" aria-label="Brote te sugiere un hábito">
    <BroteArt mood="orgulloso" size={56} />
    <div>
      <small>APRETAR TUERCAS · {pct}% EN DOS SEMANAS</small>
      <h3>Ya sostienes lo tuyo. ¿Sumamos «{idea.label}»?</h3>
      <p>{idea.why}</p>
      <p className="nudge-cue"><b>Cuándo:</b> {idea.cue}</p>
      <div className="nudge-actions">
        <button type="button" className="primary-button" onClick={e => { reward(e.currentTarget, '+1 hábito'); haptic([12, 30, 20]); commit(d => acceptIdea(d, idea)); onMessage(`Nuevo hábito: ${idea.label}. Uno a la vez.`, () => commit(d => ({ ...d, settings: { ...d.settings, habits: d.settings.habits.filter(h => h.id !== idea.id) } }))) }}>Lo sumo</button>
        <button type="button" className="quiet-button" onClick={() => commit(d => skipIdea(d, idea.id))}>Ahora no</button>
      </div>
    </div>
  </section>
}
