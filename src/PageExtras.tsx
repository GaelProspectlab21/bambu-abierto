import { dateKey, modulesOf, type AppData } from './lib/model'
import { PAGE_VERSES } from './lib/pageVerses'
import { acceptIdea, habitAdvice, skipIdea } from './lib/habitCoach'
import { habitDone } from './HabitsPage'
import { BroteArt } from './Brote'
import { reward } from './juice'
import { haptic } from './lib/haptic'

type Commit = (update: (d: AppData) => AppData) => void

/** Un número por día: el mismo versículo todo el día, otro mañana. */
function dayIndex(day: string): number {
  return Math.floor(Date.parse(`${day}T12:00:00`) / 86400000)
}

/**
 * Un versículo al pie de la página, pequeño y al final: no compite con lo que vienes a hacer.
 * Solo si usas la Biblia en bambú (no se le impone a un amigo que no la eligió).
 */
export function PageVerse({ page, data }: { page: string; data: AppData }) {
  const list = PAGE_VERSES[page]
  if (!list?.length || !modulesOf(data.settings).bible) return null
  const v = list[dayIndex(dateKey()) % list.length]
  return <figure className="page-verse">
    <blockquote>{v.text}</blockquote>
    <figcaption>{v.ref}</figcaption>
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
