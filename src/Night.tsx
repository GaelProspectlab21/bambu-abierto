import { useMemo, useState } from 'react'
import { StretchCard } from './Stretch'
import { activeHabits, dateKey, modulesOf, type AppData, type Checkin } from './lib/model'
import { compareDay, measures, measureStats, verdict } from './lib/measure'
import { shift } from './lib/coach'
import { haptic } from './lib/haptic'
import { playSound } from './lib/sounds'
import { HabitList } from './HabitsPage'
import { ClosingSheet } from './ClosingSheet'
import { BroteArt } from './Brote'
import { Card, Chips, Heading, Stepper } from './ui'
import { VaraCard } from './Vara'
import { varaOf, type Anchors } from './lib/vara'
import { plural } from './lib/text'
import { votesOn } from './lib/identity'
import { proteinMealsOn } from './lib/nutrition'

type Commit = (update: (d: AppData) => AppData) => void

/** Un toque en la mañana: con cuánto amaneciste. Es la vara con la que te mides en la noche. */
export function AnchorCard({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: (t: string) => void }) {
  const today = dateKey()
  const row = data.checkins.find(c => c.day === today)
  const [open, setOpen] = useState(false)
  function set(capacity: number) {
    commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== today), { ...(d.checkins.find(c => c.day === today) ?? { id: today, day: today }), id: today, day: today, capacity }] }))
    haptic()
    setOpen(false)
    onMessage(capacity <= 40 ? `Hoy traes ${capacity}%. Da todo ese ${capacity}% y el día es tuyo.` : `Hoy traes ${capacity}%. Esa es tu medida.`)
  }
  if (row?.capacity !== undefined && !open) return <Card tone="quiet" className="anchor-done"><div><span className="eyebrow">TU MEDIDA DE HOY</span><strong>Amaneciste con {row.capacity}%</strong></div><button className="quiet-button" onClick={() => setOpen(true)}>Cambiar</button></Card>
  return <Card className="anchor">
    <span className="eyebrow">TU MEDIDA DE HOY</span>
    <h2>¿Con cuánto amaneciste?</h2>
    <p className="hint">No es cuánto vas a hacer, es cuánto traes. En la noche te preguntas si lo diste.</p>
    <Chips label="Con cuánto amaneciste" value={row?.capacity} onChange={set} options={[[20, '20%'], [40, '40%'], [60, '60%'], [80, '80%'], [100, '100%']]} />
  </Card>
}

/** Tus últimos 14 días contra tu propia medida. */
export function GivenHistory({ data, today }: { data: AppData; today: string }) {
  const list = useMemo(() => measures(data, today, 14), [data, today])
  const st = measureStats(list)
  return <Card>
    <span className="eyebrow">LA BARRA DE TUS ÚLTIMOS DÍAS</span>
    <h2>{st.counted ? `${st.gaveDays} de ${plural(st.counted, 'día', 'días')} diste lo que traías` : 'Aquí vas a ver tu medida'}</h2>
    <div className="given-cols" role="img" aria-label="Capacidad y entrega de los últimos 14 días">
      {list.map(({ day, m }) => <div key={day} className="given-col">
        <div className="given-col-track">{m && <><span className="cap" style={{ height: `${m.capacity}%` }} /><span className={`fill ${m.gave ? 'gave' : ''}`} style={{ height: `${Math.min(100, m.given)}%` }} /></>}</div>
        <small>{'DLMMJVS'[new Date(`${day}T12:00:00`).getDay()]}</small></div>)}
    </div>
    {st.counted > 0 && <p className="hint">En promedio traías {st.avgCapacity}% y diste {st.avgGiven}%. La zona clara es lo que traías; el verde, lo que diste.</p>}
    {st.overGiving && <p className="caution">Llevas cinco días dando bastante más de lo que traías. Eso se paga. Hoy cuida el descanso.</p>}
  </Card>
}

/** Cuánto es de verdad tu 100%: lo que haces con cada nivel de capacidad, según tus propios días. */
function Comparators({ data, day, capacity }: { data: AppData; day: string; capacity: number }) {
  const c = useMemo(() => compareDay(data, day, capacity), [data, day, capacity])
  const m = modulesOf(data.settings)
  const cell = (o: { readMin: number; focusMin: number; habits: number; sets: number }) => [m.reading && `${o.readMin} min lees`, m.focus && `${o.focusMin} min enfocas`, m.training && `${plural(o.sets, 'serie', 'series')}`, `${plural(o.habits, 'hábito', 'hábitos')}`].filter(Boolean).join(' · ')
  return <Card className="compare-card">
    <span className="eyebrow">CUÁNTO ES DE VERDAD TU 100%</span>
    <h2>Compáralo con tus propios días</h2>
    <div className="compare-rows">
      {c.rows.map(r => <div key={r.band} className={`compare-row ${r.band === c.todayBand ? 'mine' : ''}`}>
        <div><strong>{r.label}</strong><small>{r.days} {r.days === 1 ? 'día' : 'días'}{r.sleep !== null ? ` · duermes ${r.sleep} h` : ''}</small></div>
        <span>{r.avg ? cell(r.avg) : 'faltan días para saberlo'}</span></div>)}
      <div className="compare-row today"><div><strong>Hoy</strong><small>lo que hiciste</small></div><span>{cell(c.today)}</span></div>
    </div>
    {c.lines.map(l => <p key={l} className="verdict verdict-todo">{l}</p>)}
    {!c.enough && <p className="hint">Con dos días medidos de cada nivel aparece tu referencia. Mientras tanto, la vara es la tuya de hoy.</p>}
  </Card>
}

const BLOCKERS = ['Cansancio', 'Distracciones', 'Imprevisto', 'Desánimo', 'Otro']

export function NightPage({ data, commit, onMessage, go }: { data: AppData; commit: Commit; onMessage: (t: string) => void; go: (s: 'Hoy') => void }) {
  // Pasada la medianoche todavía estás cerrando el día de ayer.
  const today = new Date().getHours() < 4 ? shift(dateKey(), -1) : dateKey()
  const row = data.checkins.find(c => c.day === today)
  const m = modulesOf(data.settings)
  const [capacity, setCapacity] = useState(row?.capacity ?? 60)
  // Lo que diste ya no se desliza: sale de tus promesas y de tres respuestas de conducta (vara.ts).
  const [anchors, setAnchors] = useState<Anchors>(row?.anchors ?? {})
  const [felt, setFelt] = useState<number | undefined>(row?.felt)
  const vara = varaOf({ capacity, promises: row?.promises, anchors }, data, today)
  const given = vara.given ?? 0
  const ready = vara.given !== null && vara.answered === 3
  const [blocker, setBlocker] = useState(row?.blocker ?? '')
  const [sleep, setSleep] = useState(row?.sleepHours ?? data.settings.sleepTarget)
  const [energy, setEnergy] = useState<number | undefined>(row?.energy)
  const [meals, setMeals] = useState<number | undefined>(row?.proteinMeals ?? proteinMealsOn(data, today))
  const [pain, setPain] = useState(row?.pain ?? '')
  const [text, setText] = useState(row?.reflection ?? '')
  const [closing, setClosing] = useState(false)
  const v = verdict(capacity, given)
  const north = data.profile.north?.trim() || 'la persona que quiero ser'
  const votesToday = useMemo(() => votesOn(data, today), [data, today])

  function save() {
    if (!ready) return
    const next: Checkin = { ...(row ?? { id: today, day: today }), id: today, day: today, capacity, given, anchors, felt, sleepHours: sleep, energy,
      blocker: v.kind === 'parte' && blocker ? blocker : undefined, reflection: text.trim() || undefined }
    if (m.training) { next.proteinMeals = meals; next.pain = pain || undefined }
    commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== today), next] }))
    playSound('night')
    haptic([20, 40, 20])
    setClosing(true)
  }
  return <>
    <Heading eyebrow="REFLEXIÓN DE LA NOCHE" title="¿Diste lo que traías?" text="Cinco minutos. No se trata de dar más, sino de dar lo que había." aside={<BroteArt mood="sueno" size={72} />} />
    {m.training && <StretchCard data={data} mode="noche" />}
    <Card className="measure-card">
      <span className="eyebrow">TU MEDIDA</span>
      <label className="slider-label">Con cuánto amaneciste<output>{capacity}%</output>
        <input type="range" min="0" max="100" step="5" value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></label>
      {row?.capacity !== undefined && <p className="hint">Lo marcaste en la mañana. Cámbialo solo si te equivocaste, no porque el día salió distinto.</p>}
    </Card>
    <VaraCard data={data} day={today} capacity={capacity} anchors={anchors} felt={felt} onAnchors={setAnchors} onFelt={setFelt}
      onToggleFree={id => commit(d => ({ ...d, checkins: d.checkins.map(c => c.day !== today ? c : { ...c, promises: c.promises?.map(p => p.id === id ? { ...p, done: !p.done || undefined } : p) }) }))} />
    {ready && <Card className="measure-card">
      <p className={`verdict verdict-${v.kind}`}>{v.text}</p>
      {v.kind === 'parte' && <><label className="field-label">¿Qué te frenó? (opcional)</label>
        <Chips label="Qué te frenó" value={blocker} onChange={b => setBlocker(blocker === b ? '' : b)} options={BLOCKERS.map(b => [b, b] as [string, string])} /></>}
    </Card>}
    <Comparators data={data} day={today} capacity={capacity} />
    <Card>
      <span className="eyebrow">TU CUERPO</span>
      <label className="field-label">Horas que dormiste anoche</label>
      <Stepper label="horas de sueño" unit="h" value={sleep} onChange={setSleep} min={0} max={14} step={0.5} />
      <label className="field-label">Energía del día</label>
      <Chips label="Energía" value={energy} onChange={setEnergy} options={[[1, '1 muerto'], [2, '2'], [3, '3 normal'], [4, '4'], [5, '5 a tope']]} />
      {m.training && <>
        <label className="field-label">Comidas con proteína hoy</label>
        <Chips label="Comidas con proteína" value={meals} onChange={setMeals} options={[[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']]} />
        <label className="field-label">¿Algún dolor que no sea agujeta?</label>
        <Chips label="Dolor" value={pain} onChange={setPain} options={[['', 'No'], ['hombro', 'Hombro'], ['muñeca', 'Muñeca'], ['codo', 'Codo'], ['rodilla', 'Rodilla'], ['espalda', 'Espalda baja'], ['cuello', 'Cuello'], ['pecho', 'Pecho']]} />
        {pain === 'pecho' && <p className="caution">Dolor de pecho: mañana no entrenes y díselo hoy a un adulto. Si te falta el aire, te mareas o el dolor es fuerte, pide ayuda ya.</p>}
      </>}
    </Card>
    {activeHabits(data.settings).length > 0 && <Card><span className="eyebrow">TUS HÁBITOS DE HOY</span><HabitList data={data} commit={commit} day={today} /></Card>}
    <Card>
      <span className="eyebrow">TU LÍNEA</span>
      <h2>¿Qué hice hoy por {north}?</h2>
      {votesToday.total > 0 && <p className="night-votes">Hoy registraste <b>{plural(votesToday.total, 'hecho', 'hechos')}</b> a favor de esa persona. Los hechos ya hablaron; tu línea dice lo que sentiste.</p>}
      <textarea className="text-input" rows={3} maxLength={600} value={text} onChange={e => setText(e.target.value)} placeholder="Una línea basta. Escríbela tú." />
      <p className="hint">Esta parte es solo tuya: Bambú no la escribe ni la corrige.</p>
    </Card>
    <GivenHistory data={data} today={today} />
    <div className="save-bar"><button className="primary-button wide" onClick={save} disabled={!ready}>{ready ? 'Guardar y cerrar el día' : 'Responde las 3 preguntas de tu vara'} <span>☾</span></button></div>
    {closing && <ClosingSheet day={today} data={{ ...data, checkins: [...data.checkins.filter(c => c.day !== today), { ...(row ?? { id: today, day: today }), id: today, day: today, capacity, given, anchors }] }} onClose={() => { setClosing(false); onMessage('Día cerrado.'); go('Hoy') }} />}
  </>
}

