import { useMemo, useState } from 'react'
import { shareBlob, weekCard } from './ShareCard'
import { dateKey, modulesOf, type AppData } from './lib/model'
import { weekReport, type WeekNumbers } from './lib/weekly'
import { BroteArt } from './Brote'
import { Card, fmtDay } from './ui'

function Delta({ now, before, unit = '' }: { now: number; before: number; unit?: string }) {
  const d = now - before
  if (!before && !now) return <small className="delta">sin datos</small>
  return <small className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? `+${d}${unit}` : d < 0 ? `${d}${unit}` : 'igual'}</small>
}

/** El reporte de Brote: tu semana contra tu semana pasada. Sale el domingo y el lunes, y siempre en Historial. */
export function WeekReportCard({ data, today = dateKey() }: { data: AppData; today?: string }) {
  const r = useMemo(() => weekReport(data, today), [data, today])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const m = modulesOf(data.settings)
  if (r.empty) return <Card className="week-report">
    <span className="eyebrow">REPORTE DE LA SEMANA</span>
    <div className="report-empty"><BroteArt mood="calma" size={64} /><p>Todavía no hay reporte. Dame una semana con registros y empiezo a compararte contigo mismo.</p></div>
  </Card>
  const cells: { label: string; key: keyof WeekNumbers; unit?: string; show: boolean }[] = [
    { label: 'min leídos', key: 'readMin', show: m.reading },
    { label: 'series', key: 'sets', show: m.training },
    { label: 'min de enfoque', key: 'focusMin', show: m.focus },
    { label: 'días diste lo que traías', key: 'gaveDays', show: true },
  ]
  return <Card className="week-report">
    <div className="section-heading"><div><span className="eyebrow">REPORTE DE LA SEMANA</span><h2>Tú contra tu semana pasada</h2></div><small className="subtle-count">desde el {fmtDay(r.now.start)}</small></div>
    <div className="report-grid">{cells.filter(c => c.show).map(c => <div key={c.key}>
      <strong>{r.now[c.key]}</strong><span>{c.label}</span><Delta now={r.now[c.key] as number} before={r.before[c.key] as number} />
    </div>)}</div>
    {r.now.promised > 0 && <p className="report-promises"><b>{r.now.kept} de {r.now.promised}</b> promesas cumplidas</p>}
    <ul className="report-wins">{r.wins.map(w => <li key={w}>{w}</li>)}</ul>
    {r.watch && <p className="report-watch"><BroteArt mood="animo" size={40} /><span>{r.watch}</span></p>}
    <button type="button" className="secondary-button share-week" disabled={busy} aria-busy={busy} onClick={async () => {
      setBusy(true)
      try {
        const blob = await weekCard(r, data.profile.name, cells.filter(c => c.show).map(c => ({ label: c.label, value: r.now[c.key] as number })))
        const res = await shareBlob(blob, `bambu-semana-${r.now.start}.png`, 'Mi semana en bambú. Mide cuánto das, no cuánto produces.')
        setNote(res === 'downloaded' ? 'Imagen guardada en tus descargas.' : res === 'shared' ? 'Compartida.' : '')
      } catch { setNote('No se pudo crear la imagen. Intenta otra vez.') } finally { setBusy(false) }
    }}>{busy ? 'Creando tu imagen' : 'Compartir mi semana'} <span>↗</span></button>
    {note && <p className="hint" role="status">{note}</p>}
  </Card>
}
