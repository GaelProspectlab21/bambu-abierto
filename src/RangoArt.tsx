/**
 * Los 10 rangos dibujados en código (v11.1), con el mismo trazo a plumón que Brote.
 * Reemplazan las ilustraciones hechas con IA: tu bambú crece de semilla a bosque, y cada
 * rango se ve distinto por lo que tiene (cañas, nudos, hojas), no por un render bonito.
 * Se exportan a public/img/rango-XX.svg con scripts/dibuja_marca.mjs.
 */
const INK = '#151515', SOIL = '#7a5636', SOIL_2 = '#5c3f26', SEED = '#c79a63'
const CANA = '#7fcf5a', CANA_2 = '#5fb84a', HOJA = '#a6e07a', HOJA_2 = '#4fae4a', ORO = '#f6c443', ACERO = '#9fd0c2'

type Stalk = { x: number; h: number; w: number; segs: number; lean: number; color?: string; leaves?: number; gold?: boolean }

function stalk({ x, h, w, segs, lean, color = CANA, leaves = 2, gold = false }: Stalk, key: string) {
  const base = 160, top = base - h, seg = h / segs
  const parts = []
  for (let i = 0; i < segs; i++) {
    const y0 = base - i * seg, y1 = y0 - seg + 2, dx0 = lean * (i / segs) * h / 100, dx1 = lean * ((i + 1) / segs) * h / 100
    parts.push(<path key={`s${i}`} d={`M${x - w / 2 + dx0} ${y0}L${x - w / 2 + dx1} ${y1}Q${x + dx1} ${y1 - 2} ${x + w / 2 + dx1} ${y1}L${x + w / 2 + dx0} ${y0}Z`} fill={color} />)
  }
  const tipX = x + lean * h / 100
  for (let j = 0; j < leaves; j++) {
    const i = segs - 1 - (j % segs), y = base - (i + 1) * seg + 4, side = j % 2 ? -1 : 1
    const lx = x + lean * ((i + 1) / segs) * h / 100 + side * w / 2
    parts.push(<path key={`h${j}`} d={`M${lx} ${y}q${side * 16} -14 ${side * 36} -8q${-side * 16} 13 ${-side * 36} 8Z`} fill={gold ? ORO : j % 2 ? HOJA_2 : HOJA} />)
  }
  parts.push(<path key="t" d={`M${tipX} ${top}q-1 -9 4 -14`} fill="none" />)
  return <g key={key}>{parts}</g>
}

const SCENES: Stalk[][] = [
  [],
  [],
  [],
  [{ x: 100, h: 70, w: 12, segs: 3, lean: 2 }],
  [{ x: 100, h: 104, w: 13, segs: 5, lean: -4, color: CANA_2, leaves: 3 }],
  [{ x: 88, h: 108, w: 13, segs: 5, lean: -3, leaves: 3 }, { x: 116, h: 78, w: 11, segs: 4, lean: 5 }],
  [{ x: 80, h: 112, w: 15, segs: 5, lean: -2, leaves: 3 }, { x: 104, h: 128, w: 16, segs: 6, lean: 1, color: CANA_2, leaves: 4 }, { x: 128, h: 90, w: 13, segs: 4, lean: 4 }],
  [{ x: 58, h: 84, w: 12, segs: 4, lean: -5 }, { x: 80, h: 118, w: 14, segs: 5, lean: -2, color: CANA_2, leaves: 3 }, { x: 102, h: 132, w: 15, segs: 6, lean: 1, leaves: 4 }, { x: 124, h: 104, w: 13, segs: 5, lean: 3, color: CANA_2 }, { x: 144, h: 72, w: 11, segs: 3, lean: 6 }],
  [{ x: 46, h: 96, w: 12, segs: 4, lean: -4, color: CANA_2 }, { x: 64, h: 126, w: 13, segs: 6, lean: -2, leaves: 3 }, { x: 84, h: 140, w: 15, segs: 6, lean: -1, color: CANA_2, leaves: 4 }, { x: 104, h: 118, w: 14, segs: 5, lean: 1 }, { x: 122, h: 136, w: 14, segs: 6, lean: 2, color: CANA_2, leaves: 4 }, { x: 140, h: 100, w: 12, segs: 5, lean: 4 }, { x: 156, h: 80, w: 11, segs: 4, lean: 6, color: CANA_2 }],
  [{ x: 44, h: 104, w: 13, segs: 5, lean: -4, color: CANA_2 }, { x: 64, h: 132, w: 14, segs: 6, lean: -2, leaves: 3, gold: true }, { x: 86, h: 146, w: 16, segs: 7, lean: -1, color: CANA_2, leaves: 4 }, { x: 108, h: 126, w: 14, segs: 6, lean: 1, gold: true }, { x: 128, h: 142, w: 15, segs: 7, lean: 2, color: CANA_2, leaves: 4 }, { x: 148, h: 108, w: 13, segs: 5, lean: 4, gold: true }],
]

const ZOOM = [1.7, 1.7, 1.7, 1.45, 1.15, 1.1, 1, 1, 1, 1]

export function RangoArt({ tier, size = 168 }: { tier: number; size?: number }) {
  const t = Math.max(0, Math.min(9, Math.round(tier)))
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size} fill="none" role="img" aria-hidden="true">
    <defs><filter id="w" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="11" /><feDisplacementMap in="SourceGraphic" scale="2.6" /></filter></defs>
    {t === 9 && <circle cx="150" cy="44" r="20" fill={ORO} opacity=".9" />}
    {t === 4 && <path d="M40 60h20M46 74h16M150 54h18" stroke={ACERO} strokeWidth="4" strokeLinecap="round" />}
    <g filter="url(#w)" stroke={INK} strokeWidth={3.2 / ZOOM[t]} strokeLinecap="round" strokeLinejoin="round" transform={`translate(100 176) scale(${ZOOM[t]}) translate(-100 -176)`}>
      {SCENES[t].map((s, i) => stalk(s, `k${i}`))}
      <path d={t >= 7 ? 'M14 168q86-20 172 0q-4 14-86 14T14 168Z' : 'M44 166q56-18 112 0q-2 12-56 12T44 166Z'} fill={SOIL} />
      {t >= 7 && <path d="M40 170q12-4 24 0M120 172q14-5 28 0" stroke={SOIL_2} fill="none" />}
      {t === 0 && <><ellipse cx="100" cy="158" rx="12" ry="9" fill={SEED} /><path d="M96 154q4 4 8 0" fill="none" /></>}
      {(t === 1 || t === 2) && <><path d="M100 160v-26" fill="none" /><path d="M99 140c-10-1-18-8-19-18 11 1 18 8 19 18Z" fill={HOJA} /><path d="M101 136c2-11 11-18 22-18-2 11-11 17-22 18Z" fill={HOJA_2} /></>}
      {t === 2 && <path d="M100 160v14m0-7l-12 8m12-3l12 7m-24-14l-6 4m30-2l7 3" stroke={SEED} />}
    </g>
  </svg>
}
