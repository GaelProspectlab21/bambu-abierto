import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey, makeId, type ActiveFocus, type AppData, type Focus, type Micro } from './lib/model'
import { BINAURAL, BLOCKER_TAGS, PAUSE_REASONS, activeSeconds, byTimeOfDay, counts, hm, lastImprovement, summarize, topInterruptions, verdict, weekPace, weeks } from './lib/focusStats'
import { mondayOf, shift } from './lib/coach'
import { BinauralAudio } from './BinauralAudio'
import { Card, Chips, Empty, LightBadge, chime, fmtDay, mmss, useNow, useWakeLock } from './ui'

type Commit = (update: (d: AppData) => AppData) => void
/** Lo que llega prellenado al formulario del bloque (de una tarea, de varias, o sugerido por Jev). */
export type Preset = { task: string; taskId?: string; taskIds?: string[]; minutes?: number; level?: number | null; goal?: string; micro?: { text: string; minutes: number }[]; source?: 'jev' | 'local' }
type Props = { data: AppData; commit: Commit; onMessage: (text: string, undo?: () => void) => void; preset?: Preset | null; onPresetUsed?: () => void }

/** El bloque: formulario de preparación, ritual, en curso y cierre. Vive dentro de Tareas. */
export function FocusBlock(props: Props) {
  const active = props.data.activeFocus
  return active ? active.phase === 'ritual' ? <Ritual {...props} active={active} /> : active.phase === 'closing' || active.endedAt ? <Closing {...props} active={active} /> : <Running {...props} active={active} /> : <Setup {...props} />
}
export { FocusHistory }

function Setup({ data, commit, onMessage, preset, onPresetUsed }: Props) {
  const last = [...data.focus].filter(counts).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0) || b.day.localeCompare(a.day))[0]
  const [task, setTask] = useState(preset?.task ?? '')
  const [taskId, setTaskId] = useState(preset?.taskId)
  const [taskIds] = useState<string[]>(preset?.taskIds ?? (preset?.taskId ? [preset.taskId] : []))
  const [filled] = useState<'jev' | 'local' | null>(preset?.source ?? null)
  const [level, setLevel] = useState<number>(preset?.level ? Math.round(preset.level) : last?.level ?? 3)
  const [minutes, setMinutes] = useState(preset?.minutes ?? last?.plannedMinutes ?? 45)
  const [goal, setGoal] = useState(preset?.goal ?? '')
  const [micro, setMicro] = useState<Micro[]>(() => (preset?.micro ?? []).map(m => ({ id: makeId(), text: m.text, ...(m.minutes ? { minutes: m.minutes } : {}), done: false })))
  const [microText, setMicroText] = useState('')
  const improvement = lastImprovement(data.focus)
  const cue = data.settings.pendingCue
  useEffect(() => { if (preset) onPresetUsed?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const open = data.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  function begin() {
    if (!task.trim()) { onMessage('Escribe qué vas a trabajar.'); return }
    const next: ActiveFocus = { task: task.trim(), startedAt: Date.now(), plannedMinutes: minutes, level, phase: 'ritual', ...(taskIds.length > 1 ? { taskIds } : {}), ...(goal.trim() ? { goal: goal.trim() } : {}), ...(micro.length ? { micro } : {}), ...(taskId ? { taskId } : {}) }
    commit(d => ({ ...d, activeFocus: next, settings: { ...d.settings, pendingCue: undefined }, tasks: (taskIds.length ? taskIds : taskId ? [taskId] : []).length ? d.tasks.map(t => (taskIds.length ? taskIds : taskId ? [taskId] : []).includes(t.id) ? { ...t, status: 'in_progress', updatedAt: Date.now() } : t) : d.tasks }))
  }
  return <div className="focus-grid">
    <Card>
      {filled && <p className="note note-logro filled-note"><strong>{filled === 'jev' ? 'Jev rellenó casi todo.' : 'Se rellenó con una regla de este teléfono.'}</strong> Revisa nivel, duración y mini entregables, cambia lo que quieras y empieza.</p>}
      {improvement && <p className="note note-consejo"><strong>La vez pasada dijiste que mejorarías:</strong> {improvement}</p>}
      {cue && !task && <button className="note note-logro as-button" onClick={() => setTask(cue)}>Quedaste en retomar: <strong>{cue}</strong>. Tocar para usarla.</button>}
      <label className="field-label">¿Qué es lo único que vas a mover?<input className="text-input" value={task} maxLength={300} onChange={e => { setTask(e.target.value); setTaskId(undefined) }} placeholder="Ej. grabar la intro del video" /></label>
      {open.length > 0 && <details><summary>Elegir de mis tareas ({open.length})</summary><div className="chips">{open.slice(0, 12).map(t => <button key={t.id} className={taskId === t.id ? 'chip on' : 'chip'} onClick={() => { setTask(t.text); setTaskId(t.id); if (t.level) setLevel(Math.round(t.level)); setMinutes(t.minutes) }}>{t.text}</button>)}</div></details>}
      {last && !task && <button className="quiet-button" onClick={() => { setTask(last.task); setLevel(last.level ?? 3); setMinutes(last.plannedMinutes ?? 45) }}>Repetir: {last.task}</button>}
      <label className="field-label">Nivel de apalancamiento</label>
      <div className="levels">{[4, 3, 2, 1].map(n => <button key={n} className={level === n ? 'level on' : 'level'} aria-pressed={level === n} onClick={() => setLevel(n)}><b>N{n}</b><span>{data.settings.leverageLabels[String(n)]}</span></button>)}</div>
      <label className="field-label">Duración</label>
      <Chips label="Duración" value={minutes} onChange={setMinutes} options={[[25, '25'], [45, '45'], [60, '60'], [90, '90'], [120, '120 min']]} />
      <label className="field-label">Meta concreta del bloque <span>opcional</span><input className="text-input" value={goal} maxLength={300} onChange={e => setGoal(e.target.value)} placeholder="Ej. 3 escenas grabadas" /></label>
      <details><summary>Mini entregables ({micro.length})</summary>
        <ul className="set-list">{micro.map(m => <li key={m.id}><span>{m.text}</span><button className="quiet-button" onClick={() => setMicro(micro.filter(x => x.id !== m.id))}>Quitar</button></li>)}</ul>
        <form className="inline-form" onSubmit={e => { e.preventDefault(); if (microText.trim() && micro.length < 5) { setMicro([...micro, { id: makeId(), text: microText.trim(), done: false }]); setMicroText('') } }}><input className="text-input" value={microText} maxLength={200} onChange={e => setMicroText(e.target.value)} placeholder="Un paso que se pueda marcar" /><button className="secondary-button">Añadir</button></form>
      </details>
      <button className="primary-button wide" onClick={begin}>Preparar el bloque <span>↗</span></button>
    </Card>
    <TodayBlocks data={data} />
  </div>
}

function Ritual({ data, commit, active }: Props & { active: ActiveFocus }) {
  const items = data.settings.distractions.filter(d => d.enabled)
  const [checked, setChecked] = useState<string[]>([])
  const toggle = (id: string) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  function go() { commit(d => ({ ...d, activeFocus: d.activeFocus ? { ...d.activeFocus, phase: 'active', startedAt: Date.now() } : null })) }
  return <Card tone="accent">
    <span className="eyebrow">ANTES DE ARRANCAR</span>
    <h2>Saca las distracciones.</h2>
    <p>{active.plannedMinutes} minutos en N{active.level}: {active.task}</p>
    <div className="checklist">{items.map(i => <label key={i.id} className="checkbox-label"><input type="checkbox" checked={checked.includes(i.id)} onChange={() => toggle(i.id)} />{i.label}</label>)}</div>
    <div className="row-actions"><button className="secondary-button" onClick={() => setChecked(items.map(i => i.id))}>Ya está todo</button><button className="primary-button" onClick={go} disabled={checked.length < items.length}>Arrancar el bloque <span>↗</span></button></div>
    <button className="quiet-button" onClick={() => commit(d => ({ ...d, activeFocus: null }))}>Cancelar</button>
  </Card>
}

function Running({ commit, onMessage, active }: Props & { active: ActiveFocus }) {
  const now = useNow(true)
  useWakeLock(!active.pausedAt)
  const [capture, setCapture] = useState('')
  const [profile, setProfile] = useState('lectura')
  const seconds = activeSeconds(active, now)
  const planned = (active.plannedMinutes ?? 45) * 60
  const remaining = planned - seconds
  const rang = useRef(false)
  useEffect(() => { if (remaining <= 0 && !rang.current && !active.pausedAt) { rang.current = true; chime() } }, [remaining, active.pausedAt])
  useEffect(() => { document.title = active.pausedAt ? 'En pausa · bambu' : `${mmss(Math.max(0, remaining))} · bambu`; return () => { document.title = 'bambu' } }, [remaining, active.pausedAt])
  const elapsedMin = seconds / 60
  let acc = 0
  const visibleMicro = (active.micro ?? []).filter((m, _i, arr) => { const at = acc; acc += m.minutes ?? Math.round((active.plannedMinutes ?? 45) / arr.length); return at <= elapsedMin || m.done })
  function patch(p: Partial<ActiveFocus>) { commit(d => ({ ...d, activeFocus: d.activeFocus ? { ...d.activeFocus, ...p } : null })) }
  function pause(reason: string) { patch({ pausedAt: Date.now(), pauseReason: reason }) }
  function resume() {
    if (!active.pausedAt) return
    const secs = Math.round((Date.now() - active.pausedAt) / 1000)
    patch({ pausedAt: undefined, pausedMilliseconds: (active.pausedMilliseconds ?? 0) + Date.now() - active.pausedAt, pauses: [...(active.pauses ?? []), { at: active.pausedAt, seconds: secs, reason: active.pauseReason ?? 'otra' }], pauseReason: undefined })
  }
  function finish() {
    if (active.pausedAt) resume()
    patch({ endedAt: Date.now(), phase: 'closing' })
  }
  return <div className="focus-grid">
    <Card tone="accent" className="focus-running">
      <span className="eyebrow">{active.pausedAt ? 'EN PAUSA' : remaining > 0 ? 'EN EL BLOQUE' : 'SE ACABÓ EL TIEMPO'}</span>
      <output className="big-clock">{remaining > 0 ? mmss(remaining) : `+${mmss(-remaining)}`}</output>
      <div className="bar"><span style={{ width: `${Math.min(100, seconds / planned * 100)}%` }} /></div>
      {active.goal && <p>Meta: {active.goal}</p>}
      {active.pausedAt ? <><p>Pausa: {active.pauseReason}. {mmss((now - active.pausedAt) / 1000)}</p><button className="primary-button wide" onClick={resume}>Volver al bloque</button></>
        : <><details><summary>Pausar</summary><div className="chips">{PAUSE_REASONS.map(r => <button key={r} className="chip" onClick={() => pause(r)}>{r}</button>)}</div></details>
          <button className="primary-button wide" onClick={finish}>Terminar bloque <span>{mmss(seconds)}</span></button></>}
    </Card>
    <div className="stack">
      {visibleMicro.length > 0 && <Card><h2>Mini entregables</h2>{visibleMicro.map(m => <label key={m.id} className="checkbox-label"><input type="checkbox" checked={m.done} onChange={() => patch({ micro: (active.micro ?? []).map(x => x.id === m.id ? { ...x, done: !x.done } : x) })} />{m.text}</label>)}</Card>}
      <Card><h2>Saca el pensamiento sin salir del bloque</h2>
        <form className="inline-form" onSubmit={e => { e.preventDefault(); if (capture.trim()) { patch({ captured: [...(active.captured ?? []), capture.trim()] }); setCapture(''); onMessage('Capturado. Sigue.') } }}><input className="text-input" value={capture} maxLength={300} onChange={e => setCapture(e.target.value)} placeholder="Lo apuntas y lo sueltas" /><button className="secondary-button">Guardar</button></form>
        {(active.captured ?? []).length > 0 && <ul className="set-list">{active.captured!.map((c, i) => <li key={i}><span>{c}</span></li>)}</ul>}
      </Card>
      <Card><h2>Sonido</h2><Chips label="Perfil binaural" value={profile} onChange={setProfile} options={BINAURAL.map(b => [b.id, `${b.label} ${b.hz} Hz`] as [string, string])} />
        <BinauralAudio key={profile} enabled={!active.pausedAt} beat={BINAURAL.find(b => b.id === profile)!.hz} /></Card>
    </div>
  </div>
}

function Closing({ data, commit, onMessage, active }: Props & { active: ActiveFocus }) {
  const linked = data.tasks.filter(t => (active.taskIds ?? (active.taskId ? [active.taskId] : [])).includes(t.id))
  const [finished, setFinished] = useState<string[]>([])
  const seconds = activeSeconds(active)
  const planned = active.plannedMinutes ?? 45
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(seconds / 60)))
  const [achieved, setAchieved] = useState('')
  const [score, setScore] = useState<number>(4)
  const [improvement, setImprovement] = useState('')
  const [blockers, setBlockers] = useState<string[]>([])
  const [openLoop, setOpenLoop] = useState('')
  const [nextCue, setNextCue] = useState('')
  const [toTasks, setToTasks] = useState<string[]>([])
  const real = Math.round(seconds / 60)
  function save() {
    if (!achieved.trim()) { onMessage('Escribe qué lograste, aunque sea poco.'); return }
    const row: Focus = {
      id: `focus:${makeId()}`, day: dateKey(new Date(active.startedAt)), task: active.task, minutes: Math.min(minutes, Math.max(1, real)), result: achieved.trim(),
      source: 'bambu', status: 'completed', level: active.level, plannedMinutes: planned, startedAt: active.startedAt, endedAt: active.endedAt ?? Date.now(), focusScore: score,
      ...(active.goal ? { goal: active.goal } : {}), ...(improvement.trim() ? { improvement: improvement.trim() } : {}), ...(blockers.length ? { blockers } : {}),
      ...(active.captured?.length ? { captured: active.captured } : {}), ...(active.micro?.length ? { micro: active.micro } : {}),
      ...(openLoop.trim() ? { openLoop: openLoop.trim() } : {}), ...(nextCue.trim() ? { nextCue: nextCue.trim() } : {}),
      pausedSeconds: Math.round((active.pausedMilliseconds ?? 0) / 1000), ...(active.pauses?.length ? { pauses: active.pauses } : {}), ...(active.taskId ? { taskId: active.taskId } : {}),
    }
    const now = Date.now()
    commit(d => ({ ...d, activeFocus: null, focus: [...d.focus, row],
      settings: nextCue.trim() ? { ...d.settings, pendingCue: nextCue.trim() } : d.settings,
      tasks: [...d.tasks.map(t => finished.includes(t.id) ? { ...t, status: 'done' as const, completedOn: dateKey(), updatedAt: now } : t), ...toTasks.map(text => ({ id: makeId(), text, status: 'pending' as const, minutes: 25, level: null, updatedAt: now, notes: '', project: '', subtasks: [] }))] }))
    onMessage(`Bloque guardado: ${hm(row.minutes)} de ${hm(planned)} planeados.`)
  }
  return <Card tone="accent" className="closing">
    <span className="eyebrow">CIERRE DEL BLOQUE</span>
    <h2>{real} min reales de {planned} planeados{active.pauses?.length ? ` · ${active.pauses.length} pausas` : ''}</h2>
    <label className="field-label">¿Qué lograste?<textarea className="text-input" value={achieved} maxLength={1000} onChange={e => setAchieved(e.target.value)} /></label>
    {linked.length > 0 && <><label className="field-label">¿Cuáles terminaste? <span>se marcan hechas</span></label><Chips multiple label="Tareas terminadas" value={finished} onChange={id => setFinished(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id])} options={linked.map(t => [t.id, t.text.slice(0, 40)] as [string, string])} /></>}
    <label className="field-label">Foco del 1 al 5</label>
    <Chips label="Foco" value={score} onChange={setScore} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]} />
    <label className="field-label">¿Qué mejorarías para el siguiente? <span>te lo recuerdo al abrir el próximo</span><input className="text-input" value={improvement} maxLength={1000} onChange={e => setImprovement(e.target.value)} /></label>
    <label className="field-label">¿Qué te sacó del flow?</label>
    <Chips multiple label="Bloqueos" value={blockers} onChange={b => setBlockers(x => x.includes(b) ? x.filter(y => y !== b) : [...x, b])} options={BLOCKER_TAGS.map(b => [b, b] as [string, string])} />
    <label className="field-label">¿Quedó algo pendiente? <span>opcional</span><input className="text-input" value={openLoop} maxLength={500} onChange={e => setOpenLoop(e.target.value)} /></label>
    {openLoop.trim() && <label className="field-label">¿Con qué arrancas la próxima vez?<input className="text-input" value={nextCue} maxLength={300} onChange={e => setNextCue(e.target.value)} placeholder="La primera acción, concreta" /></label>}
    {(active.captured ?? []).length > 0 && <><label className="field-label">Tus capturas: ¿alguna va a tareas?</label><Chips multiple label="Capturas a tareas" value={toTasks} onChange={c => setToTasks(x => x.includes(c) ? x.filter(y => y !== c) : [...x, c])} options={active.captured!.map(c => [c, c] as [string, string])} /></>}
    <details><summary>Corregir minutos</summary><p className="hint">Solo hacia abajo, si se te olvidó terminarlo a tiempo.</p><input className="text-input" type="number" min={1} max={Math.max(1, real)} value={minutes} onChange={e => setMinutes(Math.max(1, Math.min(real || 1, Number(e.target.value) || 1)))} /></details>
    <button className="primary-button wide" onClick={save}>Guardar y cerrar</button>
    <button className="quiet-button" onClick={() => commit(d => ({ ...d, activeFocus: d.activeFocus ? { ...d.activeFocus, endedAt: undefined, phase: 'active' } : null }))}>Volver al bloque</button>
    <button className="quiet-button" onClick={() => { if (window.confirm('¿Descartar este bloque sin guardarlo?')) commit(d => ({ ...d, activeFocus: null })) }}>Descartar</button>
  </Card>
}

function TodayBlocks({ data }: { data: AppData }) {
  const today = dateKey()
  const rows = data.focus.filter(r => r.day === today && counts(r))
  return <Card><span className="eyebrow">HOY</span><h2>{hm(rows.reduce((s, r) => s + r.minutes, 0))} en foco</h2>{rows.length ? <ul className="set-list">{rows.map(r => <li key={r.id}><span>{r.task}</span><strong>{r.minutes} min</strong></li>)}</ul> : <Empty>Tu primer bloque del día aparece aquí.</Empty>}</Card>
}

export function WeekView({ data, compact = false }: { data: AppData; compact?: boolean }) {
  const today = dateKey()
  const goal = data.settings.weeklyFocusGoal
  const list = weeks(data, 8, today)
  const current = list[list.length - 1]
  const reference = Math.round(list.slice(0, -1).slice(-4).reduce((s, w) => s + w.minutes, 0) / 4) || null
  const daysSoFar = (new Date(`${today}T12:00:00`).getDay() + 6) % 7 + 1
  const v = verdict(current, goal, reference, daysSoFar)
  const paceText = weekPace(current.minutes, goal)
  const lastWeek = list[list.length - 2]
  const lastVerdict = verdict(lastWeek, goal, reference)
  if (compact) return <div className="week-compact"><strong>{hm(current.minutes)}</strong><span>{paceText}</span></div>
  const max = Math.max(goal, ...list.map(w => w.minutes)) || 1
  return <>
    <Card tone="accent"><span className="eyebrow">SEMANA EN CURSO</span><h2>{hm(current.minutes)}{goal > 0 ? ` de ${hm(goal)}` : ' de enfoque'}</h2><p>{paceText}</p>
      <div className="signals">{v.signals.map(s => <div key={s.id}><LightBadge light={s.light} text={s.name} /><small>{s.detail}</small></div>)}</div>
      {v.next && <p className="note note-consejo">{v.next}</p>}</Card>
    <Card><span className="eyebrow">SEMANA PASADA</span><h2>{lastVerdict.title}</h2><div className="signals">{lastVerdict.signals.map(s => <div key={s.id}><LightBadge light={s.light} text={s.name} /><small>{s.detail}</small></div>)}</div></Card>
    <Card><h2>8 semanas</h2><div className="week-bars-8" role="img" aria-label="Minutos de enfoque por semana">{list.map(w => <div key={w.start} className={w.current ? 'current' : ''}><span style={{ height: `${w.minutes / max * 100}%` }} /><small>{fmtDay(w.start)}</small></div>)}{goal > 0 && <i style={{ bottom: `${goal / max * 100}%` }} aria-hidden="true" />}</div><p className="hint">{goal > 0 ? `La línea es tu meta de ${hm(goal)}. Se cambia en Ajustes.` : 'Elige una meta en Ajustes cuando quieras comparar tu ritmo.'}</p></Card>
  </>
}

function FocusHistory({ data }: { data: AppData }) {
  const [limit, setLimit] = useState(30)
  const today = dateKey()
  const rows = useMemo(() => [...data.focus].sort((a, b) => b.day.localeCompare(a.day) || (b.startedAt ?? 0) - (a.startedAt ?? 0)), [data.focus])
  const bands = byTimeOfDay(data.focus)
  const top = topInterruptions(data.focus, shift(today, -30))
  const days = Array.from({ length: 70 }, (_, i) => shift(mondayOf(shift(today, -63)), i))
  const perDay = new Map<string, number>()
  data.focus.filter(counts).forEach(r => perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.minutes))
  const total = summarize(data.focus, '0000-01-01', '9999-12-31')
  return <>
    <Card><span className="eyebrow">10 SEMANAS</span><h2>{hm(total.minutes)} en {total.blocks} bloques, desde el inicio</h2>
      <div className="heatmap" role="img" aria-label="Minutos de enfoque por día, últimas 10 semanas">{days.map(d => { const m = perDay.get(d) ?? 0; return <span key={d} title={`${d}: ${m} min`} className={d > today ? 'future' : m >= 120 ? 'h4' : m >= 60 ? 'h3' : m >= 25 ? 'h2' : m > 0 ? 'h1' : ''} /> })}</div></Card>
    {bands && <Card><h2>Tu foco por hora del día</h2><div className="stat-row">{bands.map(b => <div key={b.label}><strong>{b.score ?? '–'}</strong><span>{b.label} · {b.blocks} bloques</span></div>)}</div><p className="hint">Promedio de foco del 1 al 5 según la hora en que arrancaste.</p></Card>}
    {top.length > 0 && <Card><h2>Lo que te interrumpe (30 días)</h2><ul className="set-list">{top.map(t => <li key={t.label}><span>{t.label}</span><strong>{t.count}</strong></li>)}</ul></Card>}
    <Card><h2>Bloques</h2><div className="block-list">{rows.slice(0, limit).map(r => <details key={r.id} className="block-item"><summary><span><strong>{r.task}</strong><small>{fmtDay(r.day)}{r.level ? ` · N${r.level}` : ''}{r.focusScore ? ` · foco ${r.focusScore}` : ''}{r.status && r.status !== 'completed' ? ` · ${r.status === 'abandoned' ? 'abandonado' : r.status}` : ''}</small></span><b>{r.durationKnown === false ? '–' : `${r.minutes} min`}</b></summary>
      {r.goal && <p><strong>Meta:</strong> {r.goal}</p>}{r.result && <p><strong>Logré:</strong> {r.result}</p>}{r.improvement && <p><strong>Mejorar:</strong> {r.improvement}</p>}
      {r.micro?.length ? <p><strong>Entregables:</strong> {r.micro.map(m => `${m.done ? '✓' : '○'} ${m.text}`).join(' · ')}</p> : null}
      {r.captured?.length ? <p><strong>Capturas:</strong> {r.captured.join(' · ')}</p> : null}{r.openLoop && <p><strong>Pendiente:</strong> {r.openLoop}{r.nextCue ? `. Arrancar con: ${r.nextCue}` : ''}</p>}
      {r.blockers?.length ? <p><strong>Bloqueos:</strong> {r.blockers.join(', ')}</p> : null}{r.pauses?.length ? <p><strong>Pausas:</strong> {r.pauses.map(p => `${p.reason} (${Math.round(p.seconds / 60)} min)`).join(', ')}</p> : null}
      <small>{r.source === 'cauce' ? 'Importado de Cauce' : 'Bambú'}{r.plannedMinutes ? ` · planeado ${r.plannedMinutes} min` : ''}</small></details>)}</div>
      {rows.length > limit && <button className="secondary-button" onClick={() => setLimit(limit + 30)}>Ver más ({rows.length - limit})</button>}</Card>
  </>
}
