import { useState } from 'react'
import { dateKey, type AppData, type Sport } from './lib/model'
import { cardioGhost, cardioOn, cardioStats, logCardio, SPORTS, walkDone, walkLabel, walkProgress, WALK_KM, WALK_MIN } from './lib/cardio'
import { ghostLine, mondayOf } from './lib/libre'
import { reward } from './juice'
import { haptic } from './lib/haptic'
import { fmtDay } from './ui'
import { Sheet } from './Sheet'
import { DuoIcon, type DuoIconName } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
type Mode = 'tiempo' | 'distancia'
const ICON: Record<Sport, DuoIconName> = { caminar: 'caminar', correr: 'rayo', bici: 'bici' }
const MINUTES = [15, 30, 45, 60, 90]
const KMS: Record<Sport, number[]> = { caminar: [1, 2, 2.5, 3, 5], correr: [2, 3, 5, 8, 10], bici: [5, 10, 15, 20, 30] }
const amount = (a: { minutes?: number; km?: number }) => [a.km ? `${a.km} km` : '', a.minutes ? `${a.minutes} min` : ''].filter(Boolean).join(' · ')

export function CardioSheet({ data, commit, onClose, onMessage }: { data: AppData; commit: Commit; onClose: () => void; onMessage: (t: string) => void }) {
  const today = dateKey()
  const [sport, setSport] = useState<Sport>('caminar')
  const [mode, setMode] = useState<Mode>('tiempo')
  const [minutes, setMinutes] = useState(30)
  const [km, setKm] = useState(2.5)
  const [custom, setCustom] = useState('')
  const progress = walkProgress(data, today)
  const done = walkDone(data, today)
  const got = walkLabel(data, today)
  const week = cardioStats(data, mondayOf(today), today)
  const todayList = cardioOn(data, today)
  const recent = data.activities.filter(a => a.sport && a.day < today).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 5)
  const typed = Number(custom.replace(',', '.'))
  const value = custom && Number.isFinite(typed) && typed > 0 ? typed : mode === 'tiempo' ? minutes : km
  const unit = mode === 'tiempo' ? 'min' : 'km'
  const name = SPORTS.find(s => s.id === sport)!.name
  const ghost = cardioGhost(data, sport, mode === 'tiempo' ? 'minutes' : 'km', today)

  function pickSport(s: Sport) {
    setSport(s)
    setKm(KMS[s][2])
    setCustom('')
  }
  function save(el: HTMLElement) {
    haptic([12, 30, 12])
    commit(d => mode === 'tiempo' ? logCardio(d, today, sport, value) : logCardio(d, today, sport, undefined, value))
    const finished = sport === 'caminar' && !done && (mode === 'tiempo' ? progress + value / WALK_MIN : progress + value / WALK_KM) >= 1
    reward(el, '+10 XP')
    const vs = ghost ? ` ${ghostLine(value, { ...ghost, kind: 'reps' }, ` ${unit}`)}` : ''
    onMessage(finished ? `¡Caminata del día cumplida!${vs}` : `Guardado: ${name.toLowerCase()} ${value} ${unit}.${vs}`)
    setCustom('')
  }

  return <Sheet title="Cardio de hoy" tall onClose={onClose}>
    <div className={`d-walk-card ${done ? 'done' : ''}`}>
      <DuoIcon name={done ? 'check' : 'caminar'} size={40} />
      <div><b>{done ? '¡Caminata cumplida!' : 'Caminar es obligatorio'}</b><small>{done ? `Hoy: ${got}` : got ? `Llevas ${got} de ${WALK_MIN} min o ${WALK_KM} km` : `${WALK_MIN} min o ${WALK_KM} km al día`}</small></div>
    </div>
    <div className="d-bar green"><span style={{ width: `${progress * 100}%` }} /></div>

    <div className="d-sports">{SPORTS.map(s => <button key={s.id} type="button" className={`d-sport ${sport === s.id ? 'on' : ''}`} onClick={() => pickSport(s.id)} aria-pressed={sport === s.id}>
      <DuoIcon name={ICON[s.id]} size={34} /><b>{s.name}</b>
    </button>)}</div>

    <div className="d-mode two" role="tablist" aria-label="Cómo lo mides">
      <button type="button" role="tab" aria-selected={mode === 'tiempo'} className={mode === 'tiempo' ? 'on' : ''} onClick={() => { setMode('tiempo'); setCustom('') }}>Tiempo</button>
      <button type="button" role="tab" aria-selected={mode === 'distancia'} className={mode === 'distancia' ? 'on' : ''} onClick={() => { setMode('distancia'); setCustom('') }}>Distancia</button>
    </div>
    <div className="d-seg">{(mode === 'tiempo' ? MINUTES : KMS[sport]).map(v => <button key={v} type="button" className={!custom && (mode === 'tiempo' ? minutes : km) === v ? 'on' : ''} onClick={() => { setCustom(''); if (mode === 'tiempo') setMinutes(v); else setKm(v) }}>{v}</button>)}</div>
    <label className="d-field row">Otro ({unit})<input className="d-input num" type="text" inputMode="decimal" placeholder={mode === 'tiempo' ? '40' : '4.2'} value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5))} /></label>
    {ghost && <div className="d-ghost-line"><DuoIcon name="fantasma" size={26} /><span>Tu fantasma: <b>{ghost.value} {unit}</b> de {name.toLowerCase()} · {fmtDay(ghost.day)}</span><em className={value > ghost.value ? 'win' : value === ghost.value ? '' : 'lose'}>{value > ghost.value ? `+${Math.round((value - ghost.value) * 100) / 100}` : value === ghost.value ? '=' : `−${Math.round((ghost.value - value) * 100) / 100}`}</em></div>}
    <button type="button" className="d-btn green wide" onClick={e => save(e.currentTarget)}>Guardar {name.toLowerCase()} · {value} {unit}</button>

    {todayList.length > 0 && <>
      <h3 className="d-sheet-h3">Hoy</h3>
      <ul className="d-read-list">{todayList.map(a => <li key={a.id}><DuoIcon name={ICON[a.sport!]} size={24} /><b>{SPORTS.find(s => s.id === a.sport)!.name}</b><em>{amount(a)}</em><button type="button" className="d-x small" aria-label="Borrar" onClick={() => commit(d => ({ ...d, activities: d.activities.filter(x => x.id !== a.id) }))}>×</button></li>)}</ul>
    </>}

    <h3 className="d-sheet-h3">Esta semana</h3>
    <div className="d-tiles">{SPORTS.map(s => <div key={s.id} className={`d-tile ${s.id === 'caminar' ? 'green' : s.id === 'correr' ? 'gold' : 'blue'}`}><span>{s.name}</span><b>{week[s.id].km || week[s.id].minutes ? amount(week[s.id]).split(' · ')[0] : '—'}</b></div>)}</div>
    <h3 className="d-sheet-h3">Tus mejores</h3>
    <ul className="d-read-list">{SPORTS.map(s => <li key={s.id}><DuoIcon name={ICON[s.id]} size={24} /><b>{s.name}</b><em>{amount({ km: week[s.id].bestKm, minutes: week[s.id].bestMin }) || '—'}</em></li>)}</ul>
    {recent.length > 0 && <>
      <h3 className="d-sheet-h3">Antes</h3>
      <ul className="d-read-list">{recent.map(a => <li key={a.id}><span>{fmtDay(a.day)}</span><b>{SPORTS.find(s => s.id === a.sport)!.name}</b><em>{amount(a)}</em></li>)}</ul>
    </>}
  </Sheet>
}
