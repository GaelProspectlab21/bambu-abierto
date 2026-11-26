import { useMemo, useState, type ReactNode } from 'react'
import { dateKey, type AppData } from './lib/model'
import { bodyAdvice, muscleStats, PERIODS, type Muscle, type MuscleStat, type Period } from './lib/musculos'
import { fmtDay } from './ui'
import { Sheet } from './Sheet'

function Body({ stats, sel, onPick }: { stats: Record<Muscle, MuscleStat>; sel: Muscle | null; onPick: (m: Muscle) => void }) {
  const part = (m: Muscle, shape: ReactNode, key: string) => <g key={key} className={`mu l${stats[m].level} ${sel === m ? 'sel' : ''}`} onClick={() => onPick(m)} role="button" aria-label={`${m}: ${stats[m].sets} series`}>{shape}</g>
  const figure = (x: number, back: boolean) => <g transform={`translate(${x} 0)`}>
    <circle className="mu-base" cx="60" cy="20" r="13" />
    <rect className="mu-base" x="54" y="31" width="12" height="9" rx="3" />
    {part('Hombros', <><ellipse cx="37" cy="48" rx="9.5" ry="8.5" /><ellipse cx="83" cy="48" rx="9.5" ry="8.5" /></>, `h${x}`)}
    {back
      ? part('Espalda', <><path d="M47 40 H73 L71 80 Q60 88 49 80Z" /><rect x="50" y="86" width="20" height="18" rx="5" /></>, 'esp')
      : part('Pecho', <><rect x="46.5" y="40" width="13" height="22" rx="5" /><rect x="60.5" y="40" width="13" height="22" rx="5" /></>, 'pec')}
    {part('Brazos', <><rect x="26" y="58" width="10" height="30" rx="5" /><rect x="84" y="58" width="10" height="30" rx="5" /><rect x="24" y="91" width="9" height="28" rx="4.5" /><rect x="87" y="91" width="9" height="28" rx="4.5" /></>, `b${x}`)}
    {!back && part('Abdomen', <rect x="48" y="65" width="24" height="40" rx="7" />, 'abs')}
    {part('Piernas', <>
      {back ? <><rect x="46" y="106" width="13.5" height="17" rx="6" /><rect x="60.5" y="106" width="13.5" height="17" rx="6" /></> : <rect x="46" y="107" width="28" height="11" rx="5" />}
      <rect x="46" y={back ? 126 : 121} width="13.5" height={back ? 46 : 50} rx="6" /><rect x="60.5" y={back ? 126 : 121} width="13.5" height={back ? 46 : 50} rx="6" />
      <rect x="47" y="175" width="11" height="46" rx="5" /><rect x="62" y="175" width="11" height="46" rx="5" />
    </>, `p${x}`)}
    <text className="mu-cap" x="60" y="242" textAnchor="middle">{back ? 'Espalda' : 'Frente'}</text>
  </g>
  return <svg className="d-body" viewBox="0 0 260 250" aria-label="Mapa de tus músculos">{figure(0, false)}{figure(140, true)}</svg>
}

export function BodyCard({ data, onTrain }: { data: AppData; onTrain?: (m: Muscle) => void }) {
  const today = dateKey()
  const [period, setPeriod] = useState<Period>('mes')
  const stats = useMemo(() => muscleStats(data, today, period), [data, today, period])
  const [sel, setSel] = useState<Muscle | null>(null)
  const s = sel ? stats[sel] : null
  const pname = PERIODS.find(p => p.id === period)!.name
  return <div className="d-card d-body-card">
    <div className="d-card-head"><h2>Tu cuerpo</h2></div>
    <div className="d-mode three" role="tablist" aria-label="Periodo">{PERIODS.map(p => <button key={p.id} type="button" role="tab" aria-selected={period === p.id} className={period === p.id ? 'on' : ''} onClick={() => setPeriod(p.id)}>{p.name}</button>)}</div>
    <p className="d-hint left">{bodyAdvice(stats)} Toca un músculo para ver tus números.</p>
    <Body stats={stats} sel={sel} onPick={setSel} />
    <div className="d-legend"><span className="l3">Mucho</span><span className="l2">Medio</span><span className="l1">Poco</span><span className="l0">Nada</span></div>
    {s && <Sheet title={s.muscle} onClose={() => setSel(null)}>
      <p className="d-hint left">{pname === 'Siempre' ? 'Desde que empezaste' : `Últimos ${pname}`}</p>
      <div className="d-tiles">
        <div className="d-tile green"><span>Series</span><b>{s.sets}</b></div>
        <div className="d-tile blue"><span>Reps</span><b>{s.reps}</b></div>
        <div className="d-tile gold"><span>Días</span><b>{s.days}</b></div>
      </div>
      {s.seconds > 0 && <p className="d-hint left">Holds: {s.seconds >= 120 ? `${Math.round(s.seconds / 6) / 10} min` : `${s.seconds} s`} en total.</p>}
      <h3 className="d-sheet-h3">Tus mejores</h3>
      {s.top.length ? <ul className="d-read-list">{s.top.map(t => <li key={t.name}><b>{t.name}</b><em>{t.best}{t.kind === 'seconds' ? ' s' : ' reps'}</em></li>)}</ul> : <p className="d-hint left">No hay series de {s.muscle.toLowerCase()} en este periodo.</p>}
      {s.lastDay && <p className="d-hint left">Última vez: {fmtDay(s.lastDay)}.</p>}
      {onTrain && <button type="button" className="d-btn green wide" onClick={() => { onTrain(s.muscle); setSel(null) }}>Ver ejercicios de {s.muscle.toLowerCase()}</button>}
    </Sheet>}
  </div>
}
