/** La barra: todo el ancho es tu 100%. La zona clara es lo que traías; el relleno, lo que diste. */
export function GivenBar({ capacity, given }: { capacity: number; given: number }) {
  const gaveIt = given >= capacity - 5
  return <div className={`given-bar ${gaveIt ? 'gave' : ''}`} role="img" aria-label={`Traías ${capacity} por ciento y diste ${given} por ciento`}>
    <div className="given-track">
      <span className="given-capacity" style={{ width: `${capacity}%` }} />
      <span className="given-fill" style={{ width: `${Math.min(100, given)}%` }} />
      <i className="given-flag" style={{ left: `${capacity}%` }} />
    </div>
    <div className="given-labels"><span>Traías <b>{capacity}%</b></span><span>Diste <b>{given}%</b></span></div>
  </div>
}
