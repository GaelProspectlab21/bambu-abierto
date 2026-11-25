import type { AppData } from './lib/model'
import { pauseHistory } from './lib/pauseHistory'
import { plural } from './lib/text'
import { Card, fmtDay } from './ui'

export function PauseHistory({ data, onSetup }: { data: AppData; onSetup: () => void }) {
  const p = pauseHistory(data)
  const max = Math.max(1, ...p.days.map(d => d.resisted))
  return <Card className="pause-history">
    <h2>YouTube y tú</h2>
    <p className="hint">Tus pausas antes de YouTube y otras apps, últimos 14 días. Cada barra cuenta las veces que elegiste otra cosa.</p>
    <ol className="pause-bars" aria-label="Decisiones por día">{p.days.map(d => <li key={d.day} aria-label={`${fmtDay(d.day)}: ${plural(d.resisted, 'vez', 'veces')}, ${d.passMinutes} min de pase`}>
      <span aria-hidden="true">{d.resisted}</span><div aria-hidden="true"><i style={{ height: `${d.resisted / max * 100}%` }} /></div>
    </li>)}</ol>
    <div className="pause-dates" aria-hidden="true"><span>{fmtDay(p.days[0].day)}</span><span>Hoy</span></div>
    <p><strong>{plural(p.resisted, 'vez', 'veces')}</strong> elegiste otra cosa. <strong>{p.passMinutes} min</strong> de pase en estos 14 días.</p>
    <p className="hint">Los minutos son pases que elegiste, no tiempo medido dentro de esas apps.</p>
    {p.best ? <p>Tu mejor día fue {fmtDay(p.best.day)}, con {plural(p.best.resisted, 'elección', 'elecciones')} distintas.</p> : <p>Todavía no hay un día destacado. Aquí solo miramos lo que pasó.</p>}
    {!p.total && <button type="button" className="secondary-button" onClick={onSetup}>Preparar mi pausa</button>}
  </Card>
}
