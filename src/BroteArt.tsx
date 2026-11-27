import { useId } from 'react'
import type { Mood } from './lib/brote'
import type { Look } from './lib/companion'

const INK = '#151515'
const RAYO = '#f6c443'
const CANA = '#6fbf52', CANA_2 = '#5aa844', HUECO = '#2f5e2a', HOJA = '#a6e07a', HOJA_2 = '#4fae4a', BANDA = '#e8642a', BANDA_2 = '#b8481a'

/**
 * Brote (v11.2): una caña de bambú cortada a machete, con el hueco a la vista, una banda anudada en la
 * frente y el brote saliendo del nudo. Sin cachetes ni ojos con brillo (lo que lo hacía "kawaii"):
 * la expresión la llevan las cejas. Dibujo plano a plumón, con el borde un poco tembloroso, como hecho a mano.
 */
export function BroteArt({ mood, size = 120, look = 'base' }: { mood: Mood; size?: number; look?: Look }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const sleepy = mood === 'sueno', proud = mood === 'orgulloso', scared = mood === 'susto' || mood === 'sinSenal', calm = mood === 'calma'
  const up = proud || mood === 'animo'
  // Cejas: la cara entera. Por defecto, determinado (inclinadas hacia adentro).
  const cejas = scared ? 'M63 69q6-5 12-2M86 67q6-3 12 2' : sleepy ? 'M63 75q6 2 12 1M86 76q6 1 12-1' : proud ? 'M63 71q6-4 12-1M86 70q6-3 12 1' : calm ? 'M63 74q6-2 12 0M86 74q6-2 12 0' : 'M63 70l12 4M98 70l-12 4'
  const ojosAbiertos = <g className="brote-eyes" fill={INK}><ellipse cx="70" cy="82" rx={scared ? 3.8 : 3.1} ry={scared ? 4.8 : 4.2} /><ellipse cx="91" cy="82" rx={scared ? 3.8 : 3.1} ry={scared ? 4.8 : 4.2} /></g>
  const ojosCerrados = <path d={proud ? 'M65 84q5-5 10 0M86 84q5-5 10 0' : 'M65 82q5 4 10 0M86 82q5 4 10 0'} stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
  const boca = scared ? <ellipse cx="81" cy="96" rx="3.6" ry="4.4" fill={INK} />
    : sleepy ? <path d="M77 96h7" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      : proud ? <path d="M72 92q9 10 18 0Z" fill={INK} />
        : mood === 'animo' ? <path d="M74 94q7 3 14-1" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          : <path d="M74 93q8 5 15-2" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
  const etiqueta = sleepy ? 'con sueño' : proud ? 'orgulloso' : calm ? 'tranquilo' : mood === 'animo' ? 'animándote' : mood === 'susto' ? 'sorprendido' : mood === 'sinSenal' ? 'buscando señal' : 'listo'
  return <svg className={`brote-art mood-${mood}`} viewBox="0 0 160 160" width={size} height={size} fill="none" role="img" aria-label={`Brote, ${etiqueta}`}>
    <defs><filter id={`w${id}`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="2.2" /></filter></defs>
    <ellipse cx="80" cy="140" rx="34" ry="5" fill="#000" opacity=".25" />
    <g filter={`url(#w${id})`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M56 63c-12 1-20 8-24 17 9-1 15-6 20-11M55 67c-9 7-12 15-11 24 6-6 9-13 11-20" fill={BANDA} />
      <g className="brote-arms" fill={HOJA_2}>{up
        ? <><path d="M56 100c-12-4-19-14-20-27 9 4 16 12 19 22Z" /><path d="M104 100c14-2 22-11 25-23-10 3-18 10-22 19Z" /></>
        : <><path d="M56 98c-12 2-19 11-21 21 10-1 18-8 21-16Z" /><path d="M104 98c12 2 19 11 21 21-10-1-18-8-21-16Z" /></>}</g>
      <path d="M55 50L105 36L106 134q-26 7-52 0Z" fill={CANA} />
      <path d="M55 50L105 36q-1 9-24 15T55 50Z" fill={HUECO} />
      <path d="M54 112q26 6 52 0" fill="none" />
      <g className="brote-leaves"><path d="M106 110q8-4 12-12" fill="none" />{sleepy
        ? <path d="M117 99c7 1 12 6 12 13-6-1-11-6-12-13Z" fill={HOJA} />
        : <><path d="M117 99c1-9 7-15 16-16-1 9-7 15-16 16Z" fill={HOJA} /><path d="M113 104c-3-7-1-14 5-18 2 7 0 13-5 18Z" fill={HOJA_2} /></>}</g>
      <path d="M54 60q26-8 52-15l1 10q-26 7-53 14Z" fill={BANDA} />
      <path d="M51 61q-4 5 2 8 5-1 5-6-3-4-7-2Z" fill={BANDA_2} />
    </g>
    <path d="M99 56q2 26 0 50" stroke={CANA_2} strokeWidth="6" strokeLinecap="round" opacity=".7" />
    <path d="M62 72q-2 16 0 32" stroke="#fff" strokeOpacity=".3" strokeWidth="4" strokeLinecap="round" />
    <path d={cejas} stroke={INK} strokeWidth="3.6" strokeLinecap="round" fill="none" />
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
