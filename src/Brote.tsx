import { useMemo, useState } from 'react'
import type { AppData } from './lib/model'
import { broteSays, type Mood } from './lib/brote'
import type { Look } from './lib/companion'
import { game } from './lib/gamification'
import { haptic } from './lib/haptic'

/** Brote dibujado a mano en SVG para poder cambiarle la cara y los brazos según el ánimo. */
export function BroteArt({ mood, size = 120, look = 'base' }: { mood: Mood; size?: number; look?: Look }) {
  const sleepy = mood === 'sueno', proud = mood === 'orgulloso', scared = mood === 'susto' || mood === 'sinSenal'
  return <svg className={`brote-art mood-${mood}`} viewBox="0 0 160 160" width={size} height={size} fill="none" role="img" aria-label={`Brote, ${mood === 'sueno' ? 'con sueño' : mood === 'orgulloso' ? 'orgulloso' : mood === 'calma' ? 'tranquilo' : mood === 'animo' ? 'animándote' : mood === 'susto' ? 'sorprendido' : mood === 'sinSenal' ? 'buscando señal' : 'contento'}`}>
    <ellipse cx="81" cy="142" rx="39" ry="6" fill="currentColor" opacity=".08" />
    <path d="M58 126v12m42-12v12" stroke="#225b46" strokeWidth="10" strokeLinecap="round" />
    <rect x="43" y="42" width="74" height="89" rx="32" fill="#89b77a" />
    <path d="M47 75h66m-66 36h66" stroke="#6a9960" strokeWidth="3" />
    <g className="brote-leaves"><path d="M80 44C46 44 49 14 49 14c26 2 31 30 31 30Z" fill="#225b46" /><path d="M80 43c-2-29 29-33 29-33 3 24-29 33-29 33Z" fill="#598852" /></g>
    {scared ? <><circle cx="67" cy="84" r="9" fill="#fff" stroke="#203c34" strokeWidth="2.5" /><circle cx="95" cy="84" r="9" fill="#fff" stroke="#203c34" strokeWidth="2.5" />
      <circle cx="68" cy="85" r="4" fill="#203c34" /><circle cx="96" cy="85" r="4" fill="#203c34" /><ellipse cx="81" cy="104" rx="5" ry="6" fill="#203c34" />
      {mood === 'susto' ? <g className="brote-bang" fill="#d1561d"><path d="M118 14h7l-2 26h-3Z" /><circle cx="121.5" cy="46" r="3.5" /><path d="M131 18h7l-2 24h-3Z" /><circle cx="134.5" cy="48" r="3.5" /><path d="M144 24h6l-2 20h-3Z" /><circle cx="147" cy="49" r="3" /></g>
        : <g className="brote-wifi" stroke="#6a9960" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M120 40a12 12 0 0 1 17 0" /><path d="M114 33a21 21 0 0 1 29 0" opacity=".45" /><path d="M108 26a30 30 0 0 1 41 0" opacity=".2" /><circle cx="128.5" cy="47" r="3" fill="#6a9960" stroke="none" /></g>}</>
      : sleepy ? <><path d="M60 85q7 5 14 0M88 85q7 5 14 0" stroke="#203c34" strokeWidth="3" strokeLinecap="round" /><circle cx="81" cy="99" r="3.5" fill="#203c34" />
      <g className="brote-z" fill="#6a9960" fontFamily="Georgia, serif" fontWeight="700"><text x="118" y="38" fontSize="15">z</text><text x="130" y="24" fontSize="19">Z</text></g></>
      : proud ? <><path d="M60 88q7-9 14 0M88 88q7-9 14 0" stroke="#203c34" strokeWidth="3" strokeLinecap="round" /><path d="M70 95q11 14 22 0" stroke="#203c34" strokeWidth="3" strokeLinecap="round" fill="#203c34" fillOpacity=".12" />
        <path d="m133 40 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e9b949" className="brote-spark" /></>
        : <><g className="brote-eyes"><ellipse cx="67" cy="84" rx="4" ry="5" fill="#203c34" /><ellipse cx="95" cy="84" rx="4" ry="5" fill="#203c34" /></g>
          {mood === 'animo' && <path d="M59 70l13 4m18 0 13-4" stroke="#203c34" strokeWidth="3" strokeLinecap="round" />}
          <path d={mood === 'calma' ? 'M76 97q5 3 10 0' : 'M75 96q6 6 12 0'} stroke="#203c34" strokeWidth="3" strokeLinecap="round" /></>}
    {proud || mood === 'animo' ? <path d="m43 98-18-26m92 26 18-26" stroke="#89b77a" strokeWidth="10" strokeLinecap="round" /> : <path d="m43 98-14-12m89 12 13-20" stroke="#89b77a" strokeWidth="10" strokeLinecap="round" />}
      {look === 'lector' && <g className="acc"><circle cx="67" cy="84" r="11" stroke="#203c34" strokeWidth="3" fill="#ffffff22" /><circle cx="95" cy="84" r="11" stroke="#203c34" strokeWidth="3" fill="#ffffff22" /><path d="M78 84h6" stroke="#203c34" strokeWidth="3" /><rect x="104" y="104" width="30" height="22" rx="3" fill="#e9b949" stroke="#203c34" strokeWidth="2.5" /><path d="M119 104v22" stroke="#203c34" strokeWidth="2.5" /></g>}
    {look === 'tareas' && <g className="acc"><path d="M43 64h74" stroke="#e9b949" strokeWidth="8" strokeLinecap="round" /><path d="M117 64l10 8m-10-8 9-9" stroke="#e9b949" strokeWidth="5" strokeLinecap="round" /></g>}
    {look === 'habitos' && <g className="acc"><circle cx="81" cy="116" r="12" fill="#e9b949" stroke="#203c34" strokeWidth="2.5" /><path d="m75 116 4 4 8-9" stroke="#203c34" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>}
    {look === 'noche' && <g className="acc"><path d="M48 50C56 14 92 6 116 22c-4 14-12 24-18 28Z" fill="#35527a" /><path d="M48 50h68" stroke="#e8eef8" strokeWidth="6" strokeLinecap="round" /><circle cx="118" cy="22" r="7" fill="#e9b949" /></g>}
    {look === 'historial' && <g className="acc"><circle cx="124" cy="96" r="14" stroke="#203c34" strokeWidth="4" fill="#ffffff33" /><path d="m134 107 14 14" stroke="#203c34" strokeWidth="5" strokeLinecap="round" /></g>}
    {look === 'ajustes' && <g className="acc"><path d="M118 100a14 14 0 1 1 8 12l-18 18-8-8 18-18" stroke="#203c34" strokeWidth="3.5" fill="#c9d3cc" strokeLinejoin="round" /></g>}
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
