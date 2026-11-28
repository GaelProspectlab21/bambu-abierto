import type { Mood } from './lib/brote'
import type { Look } from './lib/companion'

const INK = '#0e1411'
const RAYO = '#f6c443'
const CANA = '#37cb69', LABIO = '#1e9348', NUDO = '#5fe786', HUECO = '#0c2e16', HOJA = '#7fd38f', BANDA = '#fa7c20', BANDA_2 = '#c25a12'

/**
 * Brote (v11.5): la misma caña cortada a machete con banda y cejas, ahora en el idioma de toda la app:
 * plano, con labio sólido abajo de cada pieza y el nudo claro del bambú, igual que el ícono. Antes era
 * trazo negro de plumón con filtro de ruido y no le salía ningún brote. Ahora el brote sale del hueco.
 * La cara conserva sus coordenadas (ojos en 70 y 91, 82) para que los accesorios sigan cayendo en su lugar.
 */
export function BroteArt({ mood, size = 120, look = 'base' }: { mood: Mood; size?: number; look?: Look }) {
  const sleepy = mood === 'sueno', proud = mood === 'orgulloso', scared = mood === 'susto' || mood === 'sinSenal', calm = mood === 'calma'
  const up = proud || mood === 'animo'
  const cejas = scared ? 'M63 68q6-5 12-2M86 66q6-3 12 2' : sleepy ? 'M63 74q6 2 12 1M86 75q6 1 12-1' : proud ? 'M63 70q6-4 12-1M86 69q6-3 12 1' : calm ? 'M63 73q6-2 12 0M86 73q6-2 12 0' : 'M63 69l12 4M98 69l-12 4'
  const ojosAbiertos = <g className="brote-eyes" fill={INK}><ellipse cx="70" cy="82" rx={scared ? 4.6 : 4} ry={scared ? 5.8 : 5.2} /><ellipse cx="91" cy="82" rx={scared ? 4.6 : 4} ry={scared ? 5.8 : 5.2} /></g>
  const ojosCerrados = <path d={proud ? 'M65 84q5-6 10 0M86 84q5-6 10 0' : 'M65 82q5 5 10 0M86 82q5 5 10 0'} stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
  const boca = scared ? <ellipse cx="81" cy="97" rx="4" ry="5" fill={INK} />
    : sleepy ? <path d="M77 97h8" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      : proud ? <path d="M71 92q10 12 20 0Z" fill={INK} />
        : mood === 'animo' ? <path d="M73 94q8 4 16-1" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          : <path d="M73 93q8 6 16-2" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
  const etiqueta = sleepy ? 'con sueño' : proud ? 'orgulloso' : calm ? 'tranquilo' : mood === 'animo' ? 'animándote' : mood === 'susto' ? 'sorprendido' : mood === 'sinSenal' ? 'buscando señal' : 'listo'
  return <svg className={`brote-art mood-${mood}`} viewBox="0 0 160 160" width={size} height={size} fill="none" role="img" aria-label={`Brote, ${etiqueta}`}>
    <ellipse cx="80" cy="146" rx="32" ry="5" fill="#000" opacity=".28" />
    {/* Piecitos */}
    <rect x="62" y="134" width="15" height="10" rx="5" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><rect x="84" y="134" width="15" height="10" rx="5" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    {/* Brazos de hoja, con su labio */}
    <g className="brote-arms">{up
      ? <><path d="M56 102c-14-4-22-15-22-29 10 4 18 13 22 24Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M56 98c-14-4-22-15-22-29 10 4 18 13 22 24Z" fill={HOJA} /><path d="M104 102c15-2 24-12 27-25-11 3-20 11-24 21Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M104 98c15-2 24-12 27-25-11 3-20 11-24 21Z" fill={HOJA} /></>
      : <><path d="M56 102c-13 2-20 11-22 22 11-1 19-8 22-17Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M56 99c-13 2-20 11-22 22 11-1 19-8 22-17Z" fill={HOJA} /><path d="M104 102c13 2 20 11 22 22-11-1-19-8-22-17Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M104 99c13 2 20 11 22 22-11-1-19-8-22-17Z" fill={HOJA} /></>}</g>
    {/* La caña: cuerpo con labio, corte a machete y nudo */}
    <path d="M54 50L106 36V126q0 12-12 12H66q-12 0-12-12Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M54 50L106 36V118q0 12-12 12H66q-12 0-12-12Z" fill={CANA} />
    <rect x="50" y="108" width="60" height="12" rx="6" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><rect x="50" y="107" width="60" height="9" rx="4.5" fill={NUDO} />
    <path d="M54 50L106 36q-3 9-26 14T54 50Z" fill={HUECO} />
    {/* El brote que le da nombre: sale del hueco y se mece */}
    <g className="brote-leaves">{sleepy
      ? <><path d="M88 44q2-8 0-14" stroke={LABIO} strokeWidth="3.4" strokeLinecap="round" /><path d="M88 31c8 1 13 6 13 13-7-1-12-6-13-13Z" fill={HOJA} /></>
      : <><path d="M86 45q1-12 6-20" stroke={INK} strokeWidth="8" strokeLinecap="round" /><path d="M86 45q1-12 6-20" stroke={LABIO} strokeWidth="3.4" strokeLinecap="round" /><path d="M92 26c2-10 9-15 19-15-2 10-9 15-19 15Z" fill={LABIO} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M92 24c2-10 9-15 19-15-2 10-9 15-19 15Z" fill={HOJA} /><path d="M89 33c-6-6-14-7-20-3 5 6 13 7 20 3Z" fill={CANA} stroke={INK} strokeWidth="5" strokeLinejoin="round" /></>}</g>
    {/* Banda anudada */}
    <path d="M54 59q26-8 52-15v11q-26 7-52 14Z" fill={BANDA} />
    <path d="M54 66q26-7 52-14v3q-26 7-52 14Z" fill={BANDA_2} />
    <path d="M55 61c-12 0-19 6-23 15 9 0 15-5 20-10Z" fill={BANDA} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M54 66c-8 7-11 15-10 23 6-5 9-12 11-19Z" fill={BANDA_2} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <circle cx="54" cy="64" r="4.5" fill={BANDA_2} />
    <path d="M62 74q-2 16 0 30" stroke="#fff" strokeOpacity=".32" strokeWidth="4.5" strokeLinecap="round" />
    <path d={cejas} stroke={INK} strokeWidth="3.8" strokeLinecap="round" fill="none" />
    {sleepy || calm || proud ? ojosCerrados : ojosAbiertos}
    {boca}
    {sleepy && <g className="brote-z" fill="#9fd0c2" fontFamily="Fraunces, Georgia, serif" fontWeight="700"><text x="114" y="40" fontSize="14">z</text><text x="126" y="26" fontSize="19">z</text></g>}
    {proud && <g className="brote-spark" stroke={RAYO} strokeWidth="3.5" strokeLinecap="round"><path d="M126 46l-7 5M132 60l-9 1M34 46l7 5" /></g>}
    {mood === 'susto' && <g className="brote-bang" stroke={RAYO} strokeWidth="3.5" strokeLinecap="round"><path d="M126 46l-7 5M132 60l-9 1" /></g>}
    {mood === 'sinSenal' && <g className="brote-wifi" stroke="#9fd0c2" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M122 30a12 12 0 0 1 17 0" /><path d="M116 23a21 21 0 0 1 29 0" opacity=".45" /><circle cx="130.5" cy="37" r="3" fill="#9fd0c2" stroke="none" /></g>}
    {look === 'coach' && <g className="acc" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M68 104q12 10 25 0" fill="none" /><rect x="76" y="106" width="11" height="8" rx="3" fill="#c9d1d6" /></g>}
    {look === 'lector' && <g className="acc" stroke={INK} strokeWidth="2.8"><circle cx="70" cy="82" r="8.5" fill="#ffffff22" /><circle cx="91" cy="82" r="8.5" fill="#ffffff22" /><path d="M78.5 82h4" /><rect x="108" y="112" width="28" height="20" rx="3" fill={RAYO} strokeLinejoin="round" /><path d="M122 112v20" /></g>}
    {look === 'tareas' && <g className="acc" stroke={INK} strokeWidth="2.8" strokeLinejoin="round"><path d="M114 120l18-26 6 4-18 26-8 3Z" fill={RAYO} /><path d="M130 97l6 4" /></g>}
    {look === 'habitos' && <g className="acc" stroke={INK} strokeWidth="2.6"><circle cx="80" cy="122" r="9" fill={RAYO} /><path d="m75.5 122 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" /></g>}
    {look === 'noche' && <g className="acc" stroke={INK} strokeWidth="2.8" strokeLinejoin="round"><path d="M54 52C56 24 86 12 112 22c-4 10-10 18-14 24Z" fill="#35527a" /><circle cx="114" cy="22" r="6" fill={RAYO} /></g>}
    {look === 'historial' && <g className="acc" stroke={INK} strokeWidth="3.6" strokeLinecap="round"><circle cx="126" cy="114" r="11" fill="#ffffff33" /><path d="m134 122 10 10" /></g>}
    {look === 'ajustes' && <g className="acc" stroke={INK} strokeWidth="3" strokeLinejoin="round"><path d="M118 112a12 12 0 1 1 7 10l-15 15-7-7 15-15" fill="#c9d1d6" /></g>}
  </svg>
}
