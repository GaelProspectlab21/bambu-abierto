import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { esNotaCamara, exerciseList, FAMOUS, ghostLine, ghostOf, norm, recordTable, records, weeklyChallenge, CHALLENGE_XP, type Exercise, type Level } from './lib/libre'
import { logSet, undoLast } from './lib/rutina'
import { XP } from './lib/xp'
import { celebrate, chime, fmtDay, rewardSound, useNow, useWakeLock } from './ui'
import { haptic } from './lib/haptic'
import { DuoIcon } from './DuoIcons'
import { conCamara } from './lib/minutos'
import { BotonCamara, CamaraValor, GanarMinutos } from './Candado'
import { Sheet } from './Sheet'
import { wodDe, wodTexto } from './lib/wod'
import { esCamara, tipoDe } from './lib/conteo'

type Commit = (update: (d: AppData) => AppData) => void
const PREP = 10

function Ring({ frac }: { frac: number }) {
  const f = Math.max(0, Math.min(1, frac))
  return <svg className="d-dial-ring" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" className="track" pathLength="100" />
    {f > 0 && <circle cx="50" cy="50" r="46" className="fill" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - f * 100} />}
  </svg>
}

function Logger({ data, commit, ex, onClose, camaraYa = false }: { data: AppData; commit: Commit; ex: Exercise; onClose: () => void; camaraYa?: boolean }) {
  useWakeLock(true)
  const today = dateKey()
  const rec = records(data, undefined, true).get(ex.name)
  const todaySets = data.sets.filter(s => s.day === today && s.exercise === ex.name).sort((a, b) => a.at - b.at)
  const lastVal = todaySets.at(-1)?.reps ?? rec?.best ?? (ex.target || 10)
  const [count, setCount] = useState(ex.kind === 'seconds' ? 0 : lastVal)
  const [timer, setTimer] = useState<{ startedAt: number | null; before: number }>({ startedAt: null, before: 0 })
  const [prepUntil, setPrepUntil] = useState<number | null>(null)
  const [flash, setFlash] = useState<{ title: string; text: string; record: boolean } | null>(null)
  const [cam, setCam] = useState(camaraYa && esCamara(ex.name, ex.kind))
  const running = timer.startedAt !== null
  const now = useNow(running || prepUntil !== null, 200)
  const elapsed = Math.floor(timer.before + (timer.startedAt ? (now - timer.startedAt) / 1000 : 0))
  const prepLeft = prepUntil ? Math.max(0, Math.ceil((prepUntil - now) / 1000)) : 0
  const beat = rec?.kind === 'seconds' ? rec.best : 0
  const ghost = ghostOf(data, ex.name, today)
  const todayBest = todaySets.reduce((m, s) => Math.max(m, s.seconds ?? s.reps ?? 0), 0)
  const mine = Math.max(todayBest, ex.kind === 'seconds' ? elapsed : count)
  const top = Math.max(1, mine, ghost?.value ?? 0)
  const passed = useRef(false)
  const lastEver = [...data.sets].filter(s => s.exercise === ex.name && (s.reps ?? 0) > 0 && s.note !== 'hecho').sort((a, b) => a.at - b.at).at(-1)?.reps
  const quick = ex.kind === 'seconds' ? [] : [
    { label: 'Desde 0', v: 0 },
    ...(lastEver ? [{ label: 'Última', v: lastEver }] : []),
    ...(rec && rec.kind === 'reps' ? [{ label: 'Récord', v: rec.best }, { label: 'Superar', v: rec.best + 1 }] : []),
  ].filter((o, i, all) => all.findIndex(x => x.v === o.v) === i)

  useEffect(() => {
    if (!prepUntil) return
    if (prepLeft <= 0) { setPrepUntil(null); setTimer({ startedAt: Date.now(), before: 0 }); chime() } else if (prepLeft <= 3) haptic(30)
  }, [prepLeft, prepUntil])
  useEffect(() => {
    if (running && beat > 0 && elapsed > beat && !passed.current) { passed.current = true; haptic([20, 40, 20]) }
  }, [elapsed, running, beat])

  function holdTap() {
    haptic(10)
    if (timer.startedAt) { setTimer(t => ({ startedAt: null, before: t.before + (Date.now() - (t.startedAt ?? Date.now())) / 1000 })); return }
    if (elapsed === 0) { setPrepUntil(Date.now() + PREP * 1000); return }
    setTimer(t => ({ ...t, startedAt: Date.now() }))
  }
  function save(value: number, camara = false) {
    if (value <= 0) return
    const before = records(data, undefined, true).get(ex.name)
    const ch = weeklyChallenge(data, today)
    const isRecord = camara && !!before && value > before.best
    const challenge = camara && !!ch && !ch.doneDay && ch.name === ex.name && value >= ch.target
    commit(d => camara ? conCamara(d, today, ex.name, ex.kind === 'seconds' ? 'seconds' : 'reps', value) : logSet(d, today, { id: 'libre', name: ex.name, kind: ex.kind, target: ex.target }, value))
    setTimer({ startedAt: null, before: 0 })
    passed.current = false
    const unit = ex.kind === 'seconds' ? ' s' : ''
    if (challenge) { rewardSound(true); celebrate({ kind: 'achievement', title: '¡Reto de la semana cumplido!', text: `${ex.name}: ${value}${unit}. +${CHALLENGE_XP} XP` }) }
    else if (isRecord) { rewardSound(true); celebrate({ kind: 'record', title: '¡Nuevo récord!', text: `${ex.name}: ${value}${unit}. Antes ${before!.best}${unit}.` }) }
    else haptic([15, 30, 15])
    setFlash({ title: isRecord ? '¡Nuevo récord!' : camara && !before ? '¡Primer récord oficial!' : 'Serie guardada', text: `${wodDe(ex.name) ? `${wodTexto(wodDe(ex.name)!, value)} (${value} reps)` : `${value}${unit}`} · +${XP.set} XP${challenge ? ` · +${CHALLENGE_XP} XP del reto` : ''} · ${ghostLine(value, ghost, unit)}${!camara && esCamara(ex.name, ex.kind) ? ' · Récords y retos solo cuentan con la cámara' : ''}`, record: isRecord || challenge })
  }
  function undo() {
    commit(d => undoLast(d, today, ex.name))
    setFlash(null)
  }

  return <div className="d-runner" role="dialog" aria-label={`Entreno libre: ${ex.name}`}>
    <header className="d-run-top">
      <button type="button" className="d-x" onClick={onClose} aria-label="Cerrar">×</button>
      <span className="d-libre-tag">Entreno libre</span>
      <span className="d-run-count">{todaySets.length} {todaySets.length === 1 ? 'serie' : 'series'}</span>
    </header>
    <div className="d-run-body">
      <p className="d-eyebrow">{ex.group}</p>
      <h2 className="d-run-title">{ex.name}</h2>
      <span className="d-rec-chip"><DuoIcon name="estrella" size={20} />{rec ? `Récord: ${rec.best}${rec.kind === 'seconds' ? ' s' : ''}` : 'Sin récord todavía'}</span>
      {ghost && <div className="d-race">
        <div className={mine >= ghost.value ? 'win' : ''}><span>Tú hoy</span><i><em style={{ width: `${mine / top * 100}%` }} /></i><b>{mine}</b></div>
        <div className="ghost"><span><DuoIcon name="fantasma" size={18} />Fantasma</span><i><em style={{ width: `${ghost.value / top * 100}%` }} /></i><b>{ghost.value}</b></div>
        <small className="d-race-note">Tu fantasma es tu mejor serie {['hoy', 'ayer'].includes(fmtDay(ghost.day)) ? `de ${fmtDay(ghost.day)}` : `del ${fmtDay(ghost.day)}`}.</small>
      </div>}
      {ex.kind !== 'seconds' && <>
        <div className="d-adjust">
          <button type="button" className="d-btn white" onClick={() => setCount(c => Math.max(0, c - 1))} aria-label="Menos uno">−</button>
          <button type="button" className="d-dial green small tap" onClick={() => { haptic(8); setCount(c => Math.min(999, c + 1)) }} aria-label={`${count} repeticiones. Toca para sumar una`}><strong>{count}</strong><small>toca +1</small></button>
          <button type="button" className="d-btn white" onClick={() => setCount(c => Math.min(999, c + 1))} aria-label="Más uno">+</button>
        </div>
        {quick.length > 1 && <div className="d-quick">{quick.map(o => <button key={o.label} type="button" className={count === o.v ? 'on' : ''} onClick={() => { haptic(8); setCount(o.v) }}><small>{o.label}</small><b>{o.v}</b></button>)}</div>}
      </>}
      {ex.kind === 'seconds' && (prepUntil !== null
        ? <button type="button" className="d-dial gold-solid tap live" onClick={() => setPrepUntil(Date.now())} aria-label="Ya estoy"><Ring frac={prepLeft / PREP} /><strong>{prepLeft}</strong><small>acomódate</small></button>
        : <button type="button" className={`d-dial blue tap ${running ? 'live' : ''}`} onClick={holdTap} aria-label={running ? 'Pausar' : 'Empezar'}>
          <Ring frac={beat ? elapsed / beat : 0} /><strong>{elapsed}</strong><small>{beat ? (elapsed > beat ? '¡récord!' : `récord ${beat} s`) : 'segundos'}</small>
        </button>)}
      {!flash && <BotonCamara ej={ex.name} kind={ex.kind} onClick={() => setCam(true)} />}
      {todaySets.length > 0 && <div className="d-today-sets"><span className="d-today-label">Hoy</span>{todaySets.map((s, i) => <span key={s.id} className={(s.seconds ?? s.reps ?? 0) === todayBest ? 'best' : ''}><small>{esNotaCamara(s.note) ? 'Cámara' : `Serie ${i + 1}`}</small><b>{s.seconds !== undefined ? `${s.seconds} s` : s.reps}</b></span>)}</div>}
    </div>
    {flash ? <footer className={`d-feedback ${flash.record ? 'gold' : ''}`}>
      <div className="d-feedback-row">
        <span className="d-feedback-icon"><DuoIcon name={flash.record ? 'estrella' : 'check'} size={30} /></span>
        <div><b>{flash.title}</b><span>{flash.text}</span></div>
        <button type="button" className="d-link" onClick={undo}>Deshacer</button>
      </div>
      <div className="d-row2">
        <button type="button" className="d-btn white" onClick={onClose}>Otro ejercicio</button>
        <button type="button" className="d-btn green wide" onClick={() => setFlash(null)}>Otra serie</button>
      </div>
    </footer> : <footer className="d-run-foot">
      {ex.kind !== 'seconds' ? <button type="button" className="d-btn green wide" disabled={count <= 0} onClick={() => save(count)}>Guardar {count}</button>
        : prepUntil !== null ? <div className="d-row2"><button type="button" className="d-btn white" onClick={() => setPrepUntil(null)}>Cancelar</button><button type="button" className="d-btn green wide" onClick={() => setPrepUntil(Date.now())}>Ya estoy</button></div>
          : <div className="d-row2">
            {elapsed > 0 && !running && <button type="button" className="d-btn white" onClick={() => setTimer({ startedAt: null, before: 0 })}>Reiniciar</button>}
            {elapsed > 0 ? <button type="button" className="d-btn green wide" onClick={() => save(elapsed)}>Guardar {elapsed} s</button>
              : <button type="button" className="d-btn blue wide" onClick={() => { setPrepUntil(Date.now() + PREP * 1000) }}>Empezar</button>}
          </div>}
    </footer>}
    {cam && <CamaraValor ej={ex.name} kind={ex.kind} onCerrar={() => setCam(false)} onValor={v => { setCam(false); save(v, true) }} />}
  </div>
}

export function LibrePage({ data, commit, onAmigos }: { data: AppData; commit: Commit; onAmigos?: () => void }) {
  const today = dateKey()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('Todos')
  const [pick, setPick] = useState<Exercise | null>(null)
  const [own, setOwn] = useState<{ name: string; kind: 'reps' | 'seconds' } | null>(null)
  const [romper, setRomper] = useState(false)
  const [all, setAll] = useState(false)
  const [directo, setDirecto] = useState(false)
  const list = useMemo(() => exerciseList(data), [data])
  const famosos = useMemo(() => (Object.keys(FAMOUS) as Level[]).flatMap(l => FAMOUS[l]), [])
  const groups = ['Todos', 'Famosos', ...new Set(list.map(e => e.group))]
  const shown = (group === 'Famosos' ? famosos.map(n => list.find(e => e.name === n)).filter((e): e is Exercise => !!e) : list.filter(e => group === 'Todos' || e.group === group)).filter(e => norm(e.name).includes(norm(q)))
  const abrir = (e: Exercise, camara = false) => { setDirecto(camara); setPick(e) }
  const porNombre = (n: string): Exercise => list.find(x => x.name === n) ?? { name: n, kind: tipoDe(n), group: 'Míos', target: 10 }

  const table = recordTable(data, true)
  const ch = weeklyChallenge(data, today)
  const recs = records(data, undefined, true)

  return <section className="d-page">
    <div className="d-libre-top">
      <button type="button" className="d-libre-big gold" onClick={() => { haptic(8); setRomper(true) }}>
        <DuoIcon name="estrella" size={34} />
        <b>Romper tu récord</b>
        <small>{table.length ? `${table.length} ${table.length === 1 ? 'récord' : 'récords'} con cámara` : 'Pon tu primer récord'}</small>
      </button>
      {onAmigos && <button type="button" className="d-libre-big blue" onClick={() => { haptic(8); onAmigos() }}>
        <DuoIcon name="amigos" size={34} />
        <b>Tablas con amigos</b>
        <small>Liga de amigos</small>
      </button>}
    </div>

    <div className={`d-card d-challenge ${ch?.doneDay ? 'done' : ''}`}>
      <div className="d-card-head"><h2>Reto de la semana</h2><DuoIcon name={ch?.doneDay ? 'check' : 'estrella'} size={34} /></div>
      {ch ? <>
        <p className="d-challenge-goal">{ch.name}: <b>{ch.target}{ch.kind === 'seconds' ? ' s' : ' reps'}</b> en una serie</p>
        <div className="d-bar gold"><span style={{ width: `${Math.min(100, ch.best / ch.target * 100)}%` }} /></div>
        <p className="d-hint left">{ch.doneDay ? `¡Cumplido ${['hoy', 'ayer'].includes(fmtDay(ch.doneDay)) ? fmtDay(ch.doneDay) : `el ${fmtDay(ch.doneDay)}`}! +${CHALLENGE_XP} XP` : `Esta semana llevas ${ch.best}${ch.kind === 'seconds' ? ' s' : ''} con cámara. Lógralo con la cámara y ganas +${CHALLENGE_XP} XP.`}</p>
        {!ch.doneDay && <button type="button" className="d-btn gold wide" onClick={() => abrir(porNombre(ch.name), true)}>Intentarlo con cámara</button>}
      </> : <p className="d-hint left">Entrena esta semana y el lunes te pongo un reto a tu medida.</p>}
    </div>

    <div className="d-card">
      <h2>Elige un ejercicio</h2>
      <input className="d-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ejercicio" />
      <div className="d-chips scroll">{groups.map(g => <button key={g} type="button" className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{g}</button>)}</div>
      <ul className="d-ex">{shown.slice(0, 40).map(e => {
        const r = recs.get(e.name)
        return <li key={e.name}><button type="button" className="d-ex-row" onClick={() => abrir(e)}>
          <span className={`d-ex-icon ${e.kind}`}><DuoIcon name={e.kind === 'seconds' ? 'reloj' : 'pesa'} size={28} /></span>
          <span className="d-ex-text"><b>{e.name}</b><small>{e.group}{r ? ` · récord ${r.best}${r.kind === 'seconds' ? ' s' : ''}` : ''}</small></span>
          <span className="d-go">›</span>
        </button></li>
      })}</ul>
      {!shown.length && <p className="d-hint left">No hay ninguno con ese nombre.</p>}
      {own ? <div className="d-form">
        <input className="d-input" autoFocus value={own.name} maxLength={80} onChange={e => setOwn({ ...own, name: e.target.value })} placeholder="Nombre del ejercicio" />
        <div className="d-seg"><button type="button" className={own.kind === 'reps' ? 'on' : ''} onClick={() => setOwn({ ...own, kind: 'reps' })}>Reps</button><button type="button" className={own.kind === 'seconds' ? 'on' : ''} onClick={() => setOwn({ ...own, kind: 'seconds' })}>Segundos</button></div>
        <button type="button" className="d-btn blue wide" disabled={!own.name.trim()} onClick={() => { setPick({ name: own.name.trim(), kind: own.kind, group: 'Míos', target: own.kind === 'seconds' ? 30 : 10 }); setOwn(null) }}>Empezar</button>
      </div> : <button type="button" className="d-btn white wide" onClick={() => setOwn({ name: q.trim(), kind: 'reps' })}>Otro ejercicio</button>}
    </div>

    {romper && <Sheet title="Romper tu récord" tall onClose={() => setRomper(false)}>
      <p className="d-hint left">Récords oficiales: solo cuentan las series hechas con la cámara. Toca uno para superarlo.</p>
      {table.length ? <div className="d-rec-list">{(all ? table : table.slice(0, 12)).map(r => <div className="d-rec-row" key={r.name}>
        <span><b>{r.name}</b><small>{r.sets} {r.sets === 1 ? 'serie' : 'series'} · última {fmtDay(r.last)}</small></span>
        <em>{r.best}{r.kind === 'seconds' ? ' s' : ''}</em>
        <button type="button" className="d-btn gold small" onClick={() => { setRomper(false); abrir(porNombre(r.name), true) }}>Superar</button>
      </div>)}</div> : <>
        <p className="d-hint left">Todavía no tienes récords. Elige uno y haz tu primera serie con la cámara:</p>
        <GanarMinutos sinTasa onElegir={n => { setRomper(false); abrir(porNombre(n), true) }} />
      </>}
      {table.length > 12 && <button type="button" className="d-link" onClick={() => setAll(!all)}>{all ? 'Ver menos' : `Ver todos (${table.length})`}</button>}
    </Sheet>}
    {pick && <Logger data={data} commit={commit} ex={pick} camaraYa={directo} onClose={() => { setPick(null); setDirecto(false) }} />}
  </section>
}
