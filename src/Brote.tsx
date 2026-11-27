import { useId, useMemo, useState } from 'react'
import type { AppData } from './lib/model'
import { broteSays, type Mood } from './lib/brote'
import type { Look } from './lib/companion'
import { game } from './lib/gamification'
import { haptic } from './lib/haptic'

const INK = '#151515'
const RAYO = '#f6c443'
const CANA = '#7fcf5a', HOJA = '#a6e07a', HOJA_2 = '#4fae4a', NUDO = '#3f8a3a'
/** Brote: un tramo de bambú con su brote de dos hojas en la cabeza y hojas como brazos. Cara y brazos cambian con el ánimo. Con look 'coach' es tu entrenador (banda y silbato). */
export function BroteArt({ mood, size = 120, look = 'base' }: { mood: Mood; size?: number; look?: Look }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const sleepy = mood === 'sueno', proud = mood === 'orgulloso', scared = mood === 'susto' || mood === 'sinSenal', up = proud || mood === 'animo' || mood === 'susto'
  const cachetes = <><ellipse cx="61" cy="84" rx="6" ry="4" fill="#f2937f" opacity={sleepy ? '.35' : '.7'} /><ellipse cx="99" cy="84" rx="6" ry="4" fill="#f2937f" opacity={sleepy ? '.35' : '.7'} /></>
  const ojos = (rx: number, ry: number) => <g className="brote-eyes"><ellipse cx="66" cy="74" rx={rx} ry={ry} fill={INK} /><ellipse cx="94" cy="74" rx={rx} ry={ry} fill={INK} /><circle cx="64.4" cy="71.2" r="1.9" fill="#fff" /><circle cx="92.4" cy="71.2" r="1.9" fill="#fff" /></g>
  const risa = <><path d="M71 84q9 12 18 0Z" fill={INK} /><ellipse cx="80" cy="88.6" rx="4.2" ry="2.3" fill="#ef6b5e" /></>
  const rayos = (lado: 'ambos' | 'der') => <g stroke={RAYO} strokeWidth="3.5" strokeLinecap="round">{lado === 'ambos' && <path d="M36 40l7 6M32 54l9 1" />}<path d="M124 40l-7 6M128 54l-9 1" /></g>
  return <svg className={`brote-art mood-${mood}`} viewBox="0 0 160 160" width={size} height={size} fill="none" role="img" aria-label={`Brote, ${mood === 'sueno' ? 'con sueño' : mood === 'orgulloso' ? 'orgulloso' : mood === 'calma' ? 'tranquilo' : mood === 'animo' ? 'animándote' : mood === 'susto' ? 'sorprendido' : mood === 'sinSenal' ? 'buscando señal' : 'contento'}`}>
    {/* v11.1: dibujo plano a plumón (sin degradados ni brillos de 3D), con el borde un poco tembloroso, como hecho a mano. */}
    <defs><filter id={`w${id}`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="2.4" /></filter></defs>
    <ellipse cx="80" cy="151" rx="30" ry="4.5" fill="#000" opacity=".25" />
    <g filter={`url(#w${id})`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M64 137l-1 10q5 3 11 0l-1-10M87 137l-1 10q6 3 12 0l-1-10" fill={NUDO} />
      <g className="brote-arms" fill={HOJA_2}>{up ? <><path d="M55 84C43 76 37 63 38 47c10 7 17 19 19 31Z" /><path d="M105 84c12-8 18-21 17-37-10 7-17 19-19 31Z" /></> : <><path d="M55 80c-14 3-22 14-23 27 12-3 21-13 24-21Z" /><path d="M105 80c14 3 22 14 23 27-12-3-21-13-24-21Z" /></>}</g>
      <g className="brote-leaves"><path d="M80 39V23" fill="none" /><path d="M79 26C70 25 62 18 61 9c10 1 17 7 18 17Z" fill={HOJA} />{sleepy ? <path d="M81 25c7-6 16-6 20 0 2 4-1 8-4 7" fill={HOJA_2} /> : <path d="M81 24c3-10 12-16 22-15-2 10-11 16-22 15Z" fill={HOJA_2} />}</g>
      <path d="M56 52c0-11 10-16 24-16s25 4 25 15l2 76c0 9-9 12-27 12s-27-3-27-12Z" fill={CANA} />
      <path d="M54 113q26 6 52 0" fill="none" />
    </g>
    <path d="M63 54q-3 24 0 46" stroke="#fff" strokeOpacity=".32" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <path d="M95 120q3 6 0 13" stroke={INK} strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" fill="none" />
    {scared ? <>{ojos(5.6, 7.2)}<ellipse cx="80" cy="90" rx="4.6" ry="5.6" fill={INK} /><ellipse cx="80" cy="92.5" rx="2.8" ry="1.6" fill="#ef6b5e" />{cachetes}
      {mood === 'susto' ? <g className="brote-bang">{rayos('der')}</g>
        : <g className="brote-wifi" stroke="#7fe0a3" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M122 40a12 12 0 0 1 17 0" /><path d="M116 33a21 21 0 0 1 29 0" opacity=".45" /><circle cx="130.5" cy="47" r="3" fill="#7fe0a3" stroke="none" /></g>}</>
      : sleepy ? <><path d="M60 73q6 6 12 0M88 73q6 6 12 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><ellipse cx="80" cy="88" rx="3.2" ry="3.8" fill="#b4413c" />{cachetes}
      <g className="brote-z" fill="#7fe0a3" fontFamily="Nunito, system-ui, sans-serif" fontWeight="900"><text x="114" y="46" fontSize="14">z</text><text x="124" y="34" fontSize="18">z</text><text x="136" y="20" fontSize="22">z</text></g></>
      : proud ? <><path d="M60 76q6-7 12 0M88 76q6-7 12 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />{risa}{cachetes}<g className="brote-spark">{rayos('ambos')}</g></>
        : mood === 'calma' ? <><path d="M60 75q6-6 12 0M88 75q6-6 12 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><path d="M75 85q5 4 10 0" stroke={INK} strokeWidth="3" strokeLinecap="round" />{cachetes}</>
          : <>{ojos(5.6, 7)}
            {mood === 'animo' ? <><path d="M58 62l11 5M102 62l-11 5" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><path d="M75 86q5 4 10 0" stroke={INK} strokeWidth="3.2" strokeLinecap="round" /><path d="m128 34 2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5Z" fill={RAYO} className="brote-spark" /></> : <>{risa}{rayos('der')}</>}
            {cachetes}</>}
    {look === 'lector' && <g className="acc"><circle cx="66" cy="74" r="10.5" stroke={INK} strokeWidth="3" fill="#ffffff22" /><circle cx="94" cy="74" r="10.5" stroke={INK} strokeWidth="3" fill="#ffffff22" /><path d="M76.5 74h7" stroke={INK} strokeWidth="3" /><rect x="106" y="98" width="30" height="22" rx="3" fill="#f6c443" stroke={INK} strokeWidth="2.5" /><path d="M121 98v22" stroke={INK} strokeWidth="2.5" /></g>}
    {look === 'coach' && <g className="acc" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M55 56q25 7 51 0l1 9q-26 7-53 0Z" fill="#ef5d4c" /><path d="M105 59q10-2 14 6M105 62q6 4 6 12" fill="none" /></g>}
    {look === 'tareas' && <g className="acc"><path d="M52 56h56" stroke="#f6c443" strokeWidth="8" strokeLinecap="round" /><path d="M108 56l10 8m-10-8 9-9" stroke="#f6c443" strokeWidth="5" strokeLinecap="round" /></g>}
    {look === 'habitos' && <g className="acc"><circle cx="80" cy="102" r="10" fill="#f6c443" stroke={INK} strokeWidth="2.5" /><path d="m75 102 3.5 3.5 7-8" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>}
    {look === 'noche' && <g className="acc"><path d="M52 48C58 12 94 2 120 18c-4 14-12 24-18 30Z" fill="#35527a" /><path d="M52 48h56" stroke="#e8eef8" strokeWidth="6" strokeLinecap="round" /><circle cx="122" cy="18" r="7" fill="#f6c443" /></g>}
    {look === 'historial' && <g className="acc"><circle cx="124" cy="96" r="14" stroke={INK} strokeWidth="4" fill="#ffffff33" /><path d="m134 107 14 14" stroke={INK} strokeWidth="5" strokeLinecap="round" /></g>}
    {look === 'ajustes' && <g className="acc"><path d="M118 100a14 14 0 1 1 8 12l-18 18-8-8 18-18" stroke={INK} strokeWidth="3.5" fill="#c9d3cc" strokeLinejoin="round" /></g>}
  </svg>
}

type WeekDay = { day: string; good: boolean; future: boolean }
/** Tu bambú de la semana: un tramo por día, lleno si fue sólido. Con el bono, la hoja se pone dorada. */
export function LiveBamboo({ days, bonus, complete }: { days: WeekDay[]; bonus: boolean; complete: boolean }) {
  const h = 19, base = 162
  const topGood = days.reduce((m, d, i) => d.good ? i : m, -1)
  const topY = base - (topGood + 1) * h
  return <svg className={`live-bamboo ${complete ? 'sway' : ''}`} viewBox="0 0 90 176" width="72" height="140" role="img" aria-label={`Tu bambú de la semana: ${days.filter(d => d.good).length} de 7 días sólidos`}>
    <path d="M10 164h70" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
    <g className="bamboo-body">
      {days.map((d, i) => <rect key={d.day} x="35" y={base - (i + 1) * h + 1} width="20" height={h - 2} rx="6" className={`seg ${d.good ? 'on' : d.future ? 'future' : 'off'}`} style={{ transitionDelay: `${i * 60}ms` }} />)}
      {days.map((d, i) => i > 0 && <path key={`n${d.day}`} d={`M34 ${base - i * h}h22`} stroke="#1f3c34" strokeOpacity={d.good || days[i - 1].good ? '.35' : '.12'} strokeWidth="2" strokeLinecap="round" />)}
      <g transform={`translate(45 ${topGood < 0 ? base : topY})`} className="bamboo-leaves">
        <path d="M0 0C-24 -2 -26 -22 -26 -22c16 2 24 12 26 22Z" fill={bonus ? '#e9b949' : '#598852'} />
        <path d="M0 0C2 -22 22 -30 22 -30c2 18-14 26-22 30Z" fill={bonus ? '#d49b1a' : '#225b46'} />
      </g>
    </g>
  </svg>
}

export function BroteCard({ data, now }: { data: AppData; now: number }) {
  const minuteBucket = Math.floor(now / 60000)
  const say = useMemo(() => broteSays(data, now), [data, minuteBucket]) // eslint-disable-line react-hooks/exhaustive-deps
  const g = useMemo(() => game(data), [data])
  const [i, setI] = useState(0)
  const line = say.lines[i % say.lines.length]
  return <section className={`card brote-card mood-${say.mood}`} aria-label="Brote, tu compañero">
    <button className="brote-btn" onClick={() => { setI(n => n + 1); haptic() }} aria-label="Tocar a Brote para otro consejo"><BroteArt mood={say.mood} /></button>
    <div className="bubble" aria-live="polite">
      <p key={line}>{line}</p>
      <small>{say.lines.length > 1 ? 'Toca a Brote para otro consejo.' : ''}</small>
    </div>
    <div className="bamboo-week"><LiveBamboo days={g.week.days} bonus={g.week.bonus} complete={g.dayComplete} /><small>{g.week.good} de {g.week.goal} días sólidos</small></div>
  </section>
}
