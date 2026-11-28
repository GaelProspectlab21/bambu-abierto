import type { Anillos, Detalle } from './lib/anillos'

const RINGS: { key: keyof Anillos; label: string; r: number }[] = [
  { key: 'cuerpo', label: 'Cuerpo', r: 42 },
  { key: 'mente', label: 'Mente', r: 31 },
  { key: 'alma', label: 'Hábitos', r: 20 },
]

/** Tres anillos concéntricos: de un vistazo sabes cómo vas hoy. Un anillo que no aplica no se dibuja. */
export function AnillosDia({ a, size = 76, oro }: { a: Anillos; size?: number; oro?: Partial<Record<keyof Anillos, boolean>> }) {
  const shown = RINGS.filter(x => a[x.key] !== null)
  const label = shown.map(x => `${x.label} ${Math.round((a[x.key] ?? 0) * 100)}%`).join(', ')
  return <svg className="d-anillos" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
    {shown.map(x => <g key={x.key} className={`d-anillo ${x.key}${oro?.[x.key] ? ' oro' : ''}`}>
      <circle className="track" cx="50" cy="50" r={x.r} pathLength="100" />
      <circle className={(a[x.key] ?? 0) > 0 ? 'fill' : 'fill cero'} cx="50" cy="50" r={x.r} pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(1, a[x.key] ?? 0) * 100} />
    </g>)}
  </svg>
}

/** La leyenda dice QUÉ cuenta cada anillo y qué falta (v11.3), no un porcentaje suelto. */
export function AnillosLeyenda({ a, oro, detalle }: { a: Anillos; oro?: Partial<Record<keyof Anillos, boolean>>; detalle?: Detalle }) {
  return <div className={`d-anillos-ley ${detalle ? 'detalle' : ''}`}>
    {RINGS.filter(x => a[x.key] !== null).map(x => <span key={x.key} className={`${x.key}${oro?.[x.key] ? ' oro' : ''}${(a[x.key] ?? 0) >= 1 ? ' cerrado' : ''}`}><i /><b>{x.label}</b>{detalle ? <small>{detalle[x.key]}</small> : <b>{Math.round((a[x.key] ?? 0) * 100)}%</b>}</span>)}
  </div>
}
