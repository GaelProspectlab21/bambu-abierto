import { useMemo } from 'react'
import type { AppData } from './lib/model'
import { talloSays } from './lib/tallo'
import { BroteArt } from './Brote'

const TONE = { alerta: 'ALERTA', consejo: 'CONSEJO', logro: 'LOGRO' } as const

/** Tallo, el entrenador: su cara cambia con el día (flexiona si toca entrenar, descansa si toca descansar). */
export function TalloCard({ data, now, compact = false }: { data: AppData; now: number; compact?: boolean }) {
  const minuteBucket = Math.floor(now / 60000)
  const say = useMemo(() => talloSays(data, now), [data, minuteBucket]) // eslint-disable-line react-hooks/exhaustive-deps
  if (compact) {
    const [first, ...rest] = say.lines
    if (!first) return null
    return <section className="card tallo-mini" aria-label="Consejos de tu coach">
      <BroteArt mood="orgulloso" look="coach" size={52} />
      <div><span className="eyebrow">TU COACH DICE</span><p className={`tone-${first.tone}`}><b>{TONE[first.tone]}</b> {first.text}</p>
        {rest.length > 0 && <details><summary>{rest.length === 1 ? 'Un consejo más' : `${rest.length} consejos más`}</summary><ul>{rest.map(l => <li key={l.text} className={`tone-${l.tone}`}><b>{TONE[l.tone]}</b> {l.text}</li>)}</ul></details>}</div>
    </section>
  }
  return <section className={`card tallo-card pose-${say.pose}`} aria-label="Brote, tu entrenador">
    <span className="tallo-art"><BroteArt mood="orgulloso" look="coach" size={150} /></span>
    <div className="tallo-talk">
      <span className="eyebrow">BROTE, TU ENTRENADOR</span>
      <h2>{say.headline}</h2>
      <ul>{say.lines.map(l => <li key={l.text} className={`tone-${l.tone}`}><b>{TONE[l.tone]}</b><span>{l.text}</span></li>)}</ul>
    </div>
  </section>
}
