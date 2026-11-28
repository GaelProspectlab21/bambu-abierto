import { useMemo, useState } from 'react'
import { playSound } from './lib/sounds'
import type { AppData } from './lib/model'
import { broteSays } from './lib/brote'
import { game } from './lib/gamification'
import { haptic } from './lib/haptic'

import { BroteArt } from './BroteArt'
export { BroteArt }

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
    <button className="brote-btn" onClick={() => { setI(n => n + 1); haptic(); playSound('pop') }} aria-label="Tocar a Brote para otro consejo"><BroteArt mood={say.mood} /></button>
    <div className="bubble" aria-live="polite">
      <p key={line}>{line}</p>
      <small>{say.lines.length > 1 ? 'Toca a Brote para otro consejo.' : ''}</small>
    </div>
    <div className="bamboo-week"><LiveBamboo days={g.week.days} bonus={g.week.bonus} complete={g.dayComplete} /><small>{g.week.good} de {g.week.goal} días sólidos</small></div>
  </section>
}
