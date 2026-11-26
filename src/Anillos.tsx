import type { Anillos } from './lib/anillos'

const RINGS: { key: keyof Anillos; label: string; r: number }[] = [
  { key: 'cuerpo', label: 'Cuerpo', r: 42 },
  { key: 'mente', label: 'Mente', r: 31 },
  { key: 'alma', label: 'Alma', r: 20 },
]

/** Tres anillos concéntricos: de un vistazo sabes cómo vas hoy. Un anillo que no aplica no se dibuja. */
export function AnillosDia({ a, size = 76 }: { a: Anillos; size?: number }) {
  const shown = RINGS.filter(x => a[x.key] !== null)
  const label = shown.map(x => `${x.label} ${Math.round((a[x.key] ?? 0) * 100)}%`).join(', ')
  return <svg className="d-anillos" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
    {shown.map(x => <g key={x.key} className={`d-anillo ${x.key}`}>
      <circle className="track" cx="50" cy="50" r={x.r} pathLength="100" />
      <circle className="fill" cx="50" cy="50" r={x.r} pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(1, a[x.key] ?? 0) * 100} />
    </g>)}
  </svg>
}

export function AnillosLeyenda({ a }: { a: Anillos }) {
  return <div className="d-anillos-ley">
    {RINGS.filter(x => a[x.key] !== null).map(x => <span key={x.key} className={x.key}><i />{x.label} <b>{Math.round((a[x.key] ?? 0) * 100)}%</b></span>)}
  </div>
}
