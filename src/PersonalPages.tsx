import { DayLedger, VotesCard } from './TodayTop'
import { WeekReportCard } from './Weekly'
import { useMemo, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { exercise } from './lib/exercises'
import type { Quest } from './lib/gamification'
import { ProgressGarden } from './ProgressGarden'
import { Card, Chips, Empty, Heading, Tabs, fmtDay } from './ui'
import { plural } from './lib/text'
import { mealTotals, shiftDay, SLOT_LABEL } from './lib/nutrition'
import { Icon, type IconName } from './Icons'

type Area = 'Lectura' | 'Enfoque' | 'Entreno' | 'Comida' | 'Hábitos'
type Row = { id: string; day: string; area: Area; text: string; detail: string; minutes: number; seconds?: number; durationKnown: boolean; estimated: boolean; source?: string; status?: string; extra?: string; extraNote?: string }
/** Orden dentro de un día: lo que más pesa primero. */
const ORDER: Record<Area, number> = { Lectura: 0, Entreno: 1, Enfoque: 2, Comida: 3, Hábitos: 4 }
const STATUS_TEXT: Record<string, string> = { abandoned: 'Abandonada', active: 'Quedó abierta en Cauce', ritual: 'Preparación sin cerrar' }
const SOURCE_TEXT: Record<string, string> = { cauce: 'de Cauce', codice: 'de Códice' }
const AREA: Record<Area, { icon: IconName; cls: string }> = {
  Lectura: { icon: 'lectura', cls: 'read' }, Enfoque: { icon: 'enfoque', cls: 'focus' }, Entreno: { icon: 'entrenar', cls: 'move' },
  Comida: { icon: 'comida', cls: 'food' }, Hábitos: { icon: 'habitos', cls: 'habit' },
}
const PAGE_DAYS = 14
const WEEKS = 18
type Tab = 'diario' | 'semana' | 'bambu'
const TAB_KEY = 'bambu.hist.tab'

function rowsOf(data: AppData): Row[] {
  const growth = data.settings.age < 18
  const labels = new Map(data.settings.habits.map(h => [h.id, h.label]))
  return [
    ...data.reading.map((r): Row => ({ id: r.id, day: r.day, area: 'Lectura', text: r.title || r.note || 'Lectura', detail: [r.location, r.takeaway || r.note, r.application ? `Aplicación: ${r.application}` : ''].filter(Boolean).join('. '), minutes: r.minutes, seconds: r.seconds, durationKnown: r.durationKnown !== false, estimated: !!r.estimated, source: r.source })),
    ...data.focus.map((r): Row => ({ id: r.id, day: r.day, area: 'Enfoque', text: r.task, detail: r.result, minutes: r.minutes, durationKnown: r.durationKnown !== false, estimated: !!r.estimated, source: r.source, status: r.status })),
    ...data.training.map((r): Row => ({ id: r.id, day: r.day, area: 'Entreno', text: r.exercise, detail: r.kind === 'strength' ? `${plural(r.sets, 'serie', 'series')} × ${plural(r.reps, 'repetición', 'repeticiones')} · ${r.load}` : r.note || (r.kind === 'football' ? 'Fútbol' : 'Recuperación'), minutes: r.minutes ?? 0, durationKnown: !!r.minutes, estimated: false })),
    ...[...new Set(data.sets.map(s => s.day))].map((day): Row => {
      const sets = data.sets.filter(s => s.day === day)
      return { id: `sets:${day}`, day, area: 'Entreno', text: `${plural(sets.length, 'serie', 'series')}`, detail: [...new Set(sets.map(s => exercise(s.exercise)?.name ?? s.exercise))].join(', '), minutes: 0, durationKnown: false, estimated: false }
    }),
    ...data.activities.map((a): Row => ({ id: a.id, day: a.day, area: 'Entreno', text: ({ football: 'Fútbol', rest: 'Descanso', walk: 'Caminata', other: 'Actividad' } as const)[a.kind], detail: a.note ?? '', minutes: a.minutes ?? 0, durationKnown: !!a.minutes, estimated: false })),
    // Las comidas de un día van en un renglón: el día se lee de un vistazo.
    ...[...new Set(data.meals.map(m => m.day))].map((day): Row => {
      const meals = data.meals.filter(m => m.day === day).sort((a, b) => a.at - b.at)
      const t = meals.reduce((s, m) => { const x = mealTotals(m); return { kcal: s.kcal + x.kcal, protein: s.protein + x.protein } }, { kcal: 0, protein: 0 })
      const slots = [...new Set(meals.map(m => SLOT_LABEL[m.slot].toLowerCase()))]
      const said = slots.length > 1 ? `${slots.slice(0, -1).join(', ')} y ${slots[slots.length - 1]}` : slots[0]
      return { id: `meals:${day}`, day, area: 'Comida', text: said.charAt(0).toUpperCase() + said.slice(1), detail: [...new Set(meals.flatMap(m => m.items.map(i => i.name.toLowerCase())))].join(', '), minutes: 0, durationKnown: false, estimated: false, extra: growth ? `${Math.round(t.protein)} g` : `${t.kcal}`, extraNote: growth ? 'proteína' : 'kcal' }
    }),
    ...Object.entries(data.habits).filter(([, ids]) => ids.length).map(([day, ids]): Row => ({ id: `habits:${day}`, day, area: 'Hábitos', text: plural(ids.length, 'hábito', 'hábitos'), detail: ids.map(id => labels.get(id) ?? id).join(', '), minutes: 0, durationKnown: false, estimated: false })),
  ].sort((a, b) => b.day.localeCompare(a.day) || ORDER[a.area] - ORDER[b.area] || a.id.localeCompare(b.id))
}
function duration(r: Row): string {
  if (r.extra) return r.extra
  if (!r.durationKnown) return ''
  if (r.seconds !== undefined && r.seconds < 60) return `${r.seconds} s`
  return `${r.minutes} min`
}

/** Mapa de tus últimas semanas: cada cuadro es un día; más oscuro, más áreas tocaste. Lunes arriba. */
function YearMap({ rows, picked, onPick }: { rows: Row[]; picked: string; onPick: (day: string) => void }) {
  const today = dateKey()
  const areasByDay = new Map<string, Set<Area>>()
  rows.forEach(r => areasByDay.set(r.day, (areasByDay.get(r.day) ?? new Set()).add(r.area)))
  const monday = shiftDay(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7))
  const start = shiftDay(monday, -7 * (WEEKS - 1))
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => shiftDay(start, i))
  const active = days.filter(d => d <= today && areasByDay.has(d))
  let run = 0
  for (let d = areasByDay.has(today) ? today : shiftDay(today, -1); areasByDay.has(d); d = shiftDay(d, -1)) run++
  const month = today.slice(0, 7)
  return <Card className="year-map">
    <div className="year-stats">
      <div><strong>{active.length}</strong><span>días con algo en {WEEKS} semanas</span></div>
      <div><strong>{run}</strong><span>{run === 1 ? 'día seguido' : 'días seguidos'}</span></div>
      <div><strong>{active.filter(d => d.startsWith(month)).length}</strong><span>este mes</span></div>
    </div>
    <div className="year-grid" role="grid" aria-label="Tus días de las últimas semanas">
      {days.map(d => {
        const n = d > today ? -1 : areasByDay.get(d)?.size ?? 0
        return <button key={d} type="button" disabled={n < 0} className={`yc l${Math.min(n, 4)} ${d === today ? 'today' : ''} ${d === picked ? 'picked' : ''}`}
          aria-label={`${fmtDay(d)}: ${n > 0 ? plural(n, 'área', 'áreas') : 'sin registro'}`} onClick={() => onPick(d === picked ? '' : d)} />
      })}
    </div>
    <div className="year-legend" aria-hidden="true"><span>Menos</span>{[0, 1, 2, 3, 4].map(l => <i key={l} className={`yc l${l}`} />)}<span>Más</span></div>
  </Card>
}

function Diary({ data }: { data: AppData }) {
  const [area, setArea] = useState<Area | 'all'>('all')
  const [month, setMonth] = useState('')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState('')
  const [pages, setPages] = useState(1)
  const rows = useMemo(() => rowsOf(data), [data])
  const months = useMemo(() => [...new Set(rows.map(r => r.day.slice(0, 7)))], [rows])
  const visible = rows.filter(r => (area === 'all' || r.area === area) && (picked ? r.day === picked : !month || r.day.startsWith(month)) && (!query || `${r.text} ${r.detail}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())))
  const measured = Math.floor(visible.filter(r => !r.estimated && r.durationKnown).reduce((sum, r) => sum + (r.seconds ?? r.minutes * 60), 0) / 60)
  const days = [...new Set(visible.map(r => r.day))]
  const shownDays = days.slice(0, pages * PAGE_DAYS)
  const monthName = (m: string) => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(`${m}-15T12:00:00`))
  const weekday = (d: string) => new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date(`${d}T12:00:00`))
  const short = (d: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`))
  const reset = () => setPages(1)
  return <>
    <YearMap rows={rows} picked={picked} onPick={d => { setPicked(d); reset(); if (d) window.setTimeout(() => document.querySelector('.log-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }} />
    <div className="log-filters">
      <Chips label="Área" value={area} onChange={v => { setArea(v); reset() }} options={[['all', 'Todo'], ['Lectura', 'Lectura'], ['Entreno', 'Entreno'], ['Comida', 'Comida'], ['Enfoque', 'Enfoque'], ['Hábitos', 'Hábitos']]} />
      <div className="log-search">
        <input className="text-input" type="search" aria-label="Buscar en el historial" value={query} onChange={e => { setQuery(e.target.value); reset() }} placeholder="Buscar" />
        <select className="text-input" aria-label="Mes" value={month} onChange={e => { setMonth(e.target.value); setPicked(''); reset() }}><option value="">Todos los meses</option>{months.map(m => <option key={m} value={m}>{monthName(m)}</option>)}</select>
      </div>
      {picked && <button type="button" className="log-picked" onClick={() => setPicked('')}>Viendo {fmtDay(picked)} <Icon name="cerrar" size={14} /></button>}
      {measured > 0 && <p className="hint">{measured.toLocaleString('es-MX')} min medidos en lo que estás viendo.</p>}
    </div>
    {shownDays.length ? <div className="log-days">{shownDays.map(day => {
      const list = visible.filter(r => r.day === day)
      const areas = [...new Set(list.map(r => r.area))]
      return <section key={day} className="log-day">
        <header className="log-day-head">
          <h2><span>{day === dateKey() ? 'Hoy' : weekday(day)}</span><time dateTime={day}>{short(day)}</time></h2>
          <div className="log-dots" aria-label={areas.join(', ')}>{areas.map(a => <i key={a} className={`ar-${AREA[a].cls}`} />)}</div>
        </header>
        {list.map(r => <article key={`${r.area}:${r.id}`} className={`log-row ar-${AREA[r.area].cls}`}>
          <span className="log-ic" aria-hidden="true"><Icon name={AREA[r.area].icon} size={18} /></span>
          <div>
            <span className="log-area">{r.area}{r.source && SOURCE_TEXT[r.source] ? ` · ${SOURCE_TEXT[r.source]}` : ''}</span>
            <strong>{r.text}</strong>
            {r.detail && r.detail !== r.text && <p>{r.detail}</p>}
            {r.status && r.status !== 'completed' && <small className="log-flag">{STATUS_TEXT[r.status] ?? r.status}</small>}
          </div>
          <span className="log-dur">{duration(r)}{r.estimated && <small>estimado</small>}{r.extraNote && <small className="plain">{r.extraNote}</small>}</span>
        </article>)}
      </section>
    })}</div> : <Empty>{picked ? 'Ese día quedó en blanco. No pasa nada: mañana cuenta.' : 'No hay registros con estos filtros.'}</Empty>}
    {days.length > shownDays.length && <button className="secondary-button log-more" onClick={() => setPages(p => p + 1)}>Ver {plural(Math.min(PAGE_DAYS, days.length - shownDays.length), 'día', 'días')} más</button>}
  </>
}

export function HistoryPage({ data, go }: { data: AppData; go: (section: Quest['go']) => void }) {
  const [tab, setTab] = useState<Tab>(() => { try { const t = localStorage.getItem(TAB_KEY); return t === 'semana' || t === 'bambu' ? t : 'diario' } catch { return 'diario' } })
  const pick = (t: Tab) => { setTab(t); try { localStorage.setItem(TAB_KEY, t) } catch { /* solo recuerda la pestaña */ } }
  return <>
    <Heading eyebrow="HISTORIAL" title="Tu camino completo." text="Todo lo que registraste sigue aquí, aunque un día quede en blanco." />
    <div className="hist-tabs"><Tabs label="Vista del historial" value={tab} onChange={pick} options={[['diario', 'Diario'], ['semana', 'Semana'], ['bambu', 'Tu bambú']]} /></div>
    {tab === 'diario' && <Diary data={data} />}
    {tab === 'semana' && <><DayLedger data={data} /><WeekReportCard data={data} /><VotesCard data={data} /></>}
    {tab === 'bambu' && <ProgressGarden data={data} go={go} />}
  </>
}
