import { useState } from 'react'
import type { WeightWeek } from './lib/coach'

const W = 320, H = 150, L = 34, R = 8, T = 10, B = 22
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const label = (day: string) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`
const kg = (n: number) => n.toFixed(1)

/**
 * Promedio semanal de peso con la franja del volumen limpio (+0.5% a +2% al mes).
 * Un solo dato por semana: el día suelto engaña, el promedio no.
 */
export function WeightChart({ weeks }: { weeks: WeightWeek[] }) {
  const withData = weeks.map((w, i) => ({ ...w, i })).filter(w => w.avg !== null)
  const [pick, setPick] = useState<number | null>(null)
  if (withData.length < 2) return <p className="hint">Con dos semanas de peso aparece tu gráfica y la franja de meta.</p>
  const values = weeks.flatMap(w => [w.avg, w.low, w.high]).filter((v): v is number => v !== null)
  const lo = Math.floor((Math.min(...values) - 0.2) * 2) / 2, hi = Math.ceil((Math.max(...values) + 0.2) * 2) / 2
  const x = (i: number) => L + (i / (weeks.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const band = weeks.map((w, i) => ({ w, i })).filter(({ w }) => w.low !== null)
  const bandPath = band.length > 1 ? [...band.map(({ w, i }) => `${x(i)},${y(w.high!)}`), ...[...band].reverse().map(({ w, i }) => `${x(i)},${y(w.low!)}`)].join(' ') : ''
  const segments: string[][] = []
  weeks.forEach((w, i) => {
    if (w.avg === null) { segments.push([]); return }
    if (!segments.length) segments.push([])
    segments[segments.length - 1].push(`${x(i)},${y(w.avg)}`)
  })
  const shown = pick ?? withData[withData.length - 1].i
  const s = weeks[shown]
  const ticks = [lo, (lo + hi) / 2, hi]
  const status = s.avg === null || s.low === null ? '' : s.avg < s.low ? 'debajo de la meta' : s.avg > s.high! ? 'arriba de la meta' : 'dentro de la meta'

  return <figure className="weight-chart">
    <figcaption className="weight-readout" aria-live="polite">
      <strong>{s.avg !== null ? `${kg(s.avg)} kg` : 'sin peso'}</strong>
      <span>semana al {label(s.end)}{s.low !== null ? ` · meta ${kg(s.low)} a ${kg(s.high!)} kg` : ''}{status ? ` · ${status}` : ''}</span>
    </figcaption>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Promedio semanal de peso de las últimas 12 semanas con la franja de meta">
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="wc-grid" /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="wc-axis">{kg(t)}</text></g>)}
      {bandPath && <polygon points={bandPath} className="wc-band" />}
      {segments.filter(seg => seg.length > 1).map((seg, k) => <polyline key={k} points={seg.join(' ')} className="wc-line" />)}
      <line x1={x(shown)} x2={x(shown)} y1={T} y2={H - B} className="wc-cross" />
      {withData.map(w => <circle key={w.end} cx={x(w.i)} cy={y(w.avg!)} r={w.i === shown ? 5 : 4} className="wc-dot" />)}
      {weeks.map((w, i) => i % 3 === (weeks.length - 1) % 3 && <text key={w.end} x={x(i)} y={H - 6} textAnchor={i === weeks.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="wc-axis">{label(w.end)}</text>)}
      {weeks.map((w, i) => <rect key={w.end} x={x(i) - (W - L - R) / (weeks.length - 1) / 2} y={0} width={(W - L - R) / (weeks.length - 1)} height={H} fill="transparent"
        onPointerEnter={() => setPick(i)} onClick={() => setPick(i)} />)}
    </svg>
    <p className="hint"><span className="wc-key" aria-hidden="true" /> Franja verde: subir de 0.5 a 2% al mes, volumen limpio. Toca una semana para ver su promedio.</p>
    <details><summary>Ver como tabla</summary>
      <table className="wc-table"><thead><tr><th>Semana al</th><th>Promedio</th><th>Meta</th></tr></thead>
        <tbody>{[...weeks].reverse().map(w => <tr key={w.end}><td>{label(w.end)}</td><td>{w.avg !== null ? `${kg(w.avg)} kg` : '–'}</td><td>{w.low !== null ? `${kg(w.low)} a ${kg(w.high!)}` : '–'}</td></tr>)}</tbody></table>
    </details>
  </figure>
}
