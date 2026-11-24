import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { activeHabits, dateKey, makeId, modulesOf, type AppData, type Reading } from './lib/model'
import { RESCUES, rescueRow, votesOn, voteLine } from './lib/identity'
import { habitDone } from './HabitsPage'
import { BroteArt } from './Brote'
import { Icon } from './Icons'
import { haptic } from './lib/haptic'
import { reward } from './juice'
import type { Section } from './TodayPage'
import { OPEN_BIBLE_KEY } from './ReadingPage'
import { openStretch, stretchSlot } from './lib/stretch'
import { frequentMeals, slotFor } from './lib/nutrition'
import { saveMeal } from './FoodLogger'
import { OPEN_MEAL_KEY } from './FoodPage'

type Commit = (update: (d: AppData) => AppData) => void
type Props = { data: AppData; commit: Commit; onClose: () => void; go: (s: Section) => void; onMessage: (t: string, undo?: () => void) => void; startRescue?: boolean }

/**
 * Registrar en un toque (el widget de Pierre Dalati y la regla de los dos minutos): lo diario
 * se apunta sin abrir ninguna sección. Cada toque guarda, celebra en el botón y deja deshacer.
 */
export function QuickLog({ data, commit, onClose, go, onMessage, startRescue = false }: Props) {
  const [rescue, setRescue] = useState(startRescue)
  const sheetRef = useRef<HTMLElement>(null)
  // Al abrir, el foco entra a la hoja (lectores de pantalla y teclado no se quedan atrás).
  useEffect(() => { sheetRef.current?.focus({ preventScroll: true }) }, [])
  const today = dateKey()
  const mods = modulesOf(data.settings)
  const habits = activeHabits(data.settings)
  const votes = votesOn(data, today)
  const row = data.checkins.find(c => c.day === today)
  const hour = new Date().getHours()
  const work = data.works.find(w => w.status === 'reading')
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  function readFor(minutes: number, e: MouseEvent) {
    const r: Reading = { id: makeId(), day: today, minutes, seconds: minutes * 60, title: work?.title || 'Lectura libre', note: '', captureMode: 'manual', source: 'bambu', ...(work ? { workId: work.id } : {}) }
    commit(d => ({ ...d, reading: [...d.reading, r] }))
    reward(e.currentTarget)
    haptic([12, 30, 20])
    onMessage(`${minutes} min de lectura guardados.`, () => commit(d => ({ ...d, reading: d.reading.filter(x => x.id !== r.id) })))
  }
  function habit(id: string, label: string, e: MouseEvent) {
    const on = (data.habits[today] ?? []).includes(id)
    commit(d => { const cur = d.habits[today] ?? []; return { ...d, habits: { ...d.habits, [today]: on ? cur.filter(x => x !== id) : [...cur, id] } } })
    if (!on) { reward(e.currentTarget); haptic([12, 30, 20]); onMessage(`Hecho: ${label}.`) } else haptic(8)
  }
  function activity(kind: 'football' | 'walk' | 'rest', minutes: number | undefined, label: string, e: MouseEvent) {
    const a = { id: makeId(), day: today, kind, ...(minutes ? { minutes } : {}) }
    commit(d => ({ ...d, activities: [...d.activities, a] }))
    reward(e.currentTarget)
    haptic([12, 30, 20])
    onMessage(`${label} registrado.`, () => commit(d => ({ ...d, activities: d.activities.filter(x => x.id !== a.id) })))
  }
  function capacity(n: number, e: MouseEvent) {
    commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== today), { ...(d.checkins.find(c => c.day === today) ?? { id: today, day: today }), id: today, day: today, capacity: n }] }))
    reward(e.currentTarget)
    onMessage(`Hoy traes ${n}%. Esa es tu medida.`)
  }
  function rescued(choice: string, e: MouseEvent) {
    const a = rescueRow(choice, today)
    commit(d => ({ ...d, activities: [...d.activities, a] }))
    reward(e.currentTarget, '+1 rescate')
    haptic([20, 40, 60])
    setRescue(false)
    onMessage(`Rescate: ${choice.toLowerCase()}. Le ganaste dos minutos al celular.`, () => commit(d => ({ ...d, activities: d.activities.filter(x => x.id !== a.id) })))
  }
  const goTo = (s: Section) => { onClose(); go(s) }
  const mealSlot = slotFor(hour)
  const usual = mods.food ? frequentMeals(data, 3, mealSlot) : []
  const mealName = (m: typeof usual[number]) => { const t = m.items.slice(0, 2).map(i => i.name.toLowerCase()).join(' y '); return t.length > 30 ? t.slice(0, 28).trimEnd() + ',' : t }
  function ate(m: typeof usual[number], e: MouseEvent) {
    reward(e.currentTarget)
    saveMeal(commit, onMessage, mealSlot, m.items, data.settings.age < 18)
  }

  return <div className="ql-scrim" onClick={onClose}>
    <section ref={sheetRef} tabIndex={-1} className="ql-sheet" role="dialog" aria-modal="true" aria-label="Registrar en un toque" onClick={e => e.stopPropagation()}>
      <span className="ql-grip" aria-hidden="true" />
      <header className="ql-head">
        <BroteArt mood={votes.total ? 'orgulloso' : 'animo'} size={54} />
        <div><h2>Registra en un toque</h2><p>{votes.total ? voteLine(data.profile.north, votes.total) : 'Cada cosa que registras suma un hecho a tu día.'}</p></div>
        <button type="button" className="ql-close" onClick={onClose} aria-label="Cerrar"><Icon name="cerrar" size={20} /></button>
      </header>

      {rescue ? <div className="ql-rescue-pick">
        <h3>Bien atrapado. En vez de scrollear:</h3>
        <p className="ql-hint">Dos minutos y vuelves a decidir. Elige uno.</p>
        <div className="ql-grid">{RESCUES.map(r => <button key={r} type="button" className="ql-tile" onClick={e => rescued(r, e)}>{r}</button>)}</div>
        <button type="button" className="quiet-button" onClick={() => setRescue(false)}>Volver</button>
      </div> : <>
        <button type="button" className="ql-rescue" onClick={() => { haptic(14); setRescue(true) }}>
          <Icon name="rescate" size={26} /><span><strong>¿Ibas a abrir el celular por abrirlo?</strong><small>Atrapa el momento. Te doy algo de dos minutos.</small></span>
        </button>

        {row?.capacity === undefined && hour < 19 && <div className="ql-group">
          <h3>Con cuánto amaneciste</h3>
          <div className="ql-row">{[20, 40, 60, 80, 100].map(n => <button key={n} type="button" className="ql-chip" onClick={e => capacity(n, e)}>{n}%</button>)}</div>
        </div>}

        {mods.reading && <div className="ql-group">
          <h3><Icon name="lectura" size={18} /> Leí</h3>
          <div className="ql-row">{[5, 15, 30].map(m => <button key={m} type="button" className="ql-chip" onClick={e => readFor(m, e)}>{m} min</button>)}
            {mods.bible && <button type="button" className="ql-chip" onClick={() => { try { sessionStorage.setItem(OPEN_BIBLE_KEY, '1') } catch { /* abre Lectura igual */ } goTo('Lectura') }}>Unos versículos</button>}
            <button type="button" className="ql-chip ghost" onClick={() => goTo('Lectura')}>Con reloj</button></div>
        </div>}

        {habits.length > 0 && <div className="ql-group">
          <h3><Icon name="habitos" size={18} /> Hábitos de hoy</h3>
          <div className="ql-grid">{habits.map(h => {
            const done = habitDone(data, h, today)
            return <button key={h.id} type="button" className={`ql-tile ${done ? 'on' : ''}`} aria-pressed={!!done} disabled={done === 'auto'} onClick={e => habit(h.id, h.label, e)}>
              <i aria-hidden="true">{done ? <Icon name="check" size={16} /> : h.mark}</i>{h.label}</button>
          })}</div>
        </div>}

        {mods.food && <div className="ql-group">
          <h3><Icon name="comida" size={18} /> Comí</h3>
          <div className="ql-row">{usual.map(m => <button key={m.id} type="button" className="ql-chip" onClick={e => ate(m, e)}>{mealName(m)}</button>)}
            <button type="button" className="ql-chip ghost" onClick={() => { try { sessionStorage.setItem(OPEN_MEAL_KEY, '1') } catch { /* abre Comida igual */ } goTo('Comida') }}>{usual.length ? 'Otra cosa' : 'Registrar comida'}</button></div>
        </div>}

        {mods.training && <div className="ql-group">
          <h3><Icon name="entrenar" size={18} /> Me moví</h3>
          <div className="ql-row">
            <button type="button" className="ql-chip" onClick={e => activity('football', 60, 'Fútbol', e)}>Fútbol</button>
            <button type="button" className="ql-chip" onClick={e => activity('walk', 20, 'Caminata', e)}>Caminé</button>
            <button type="button" className="ql-chip" onClick={() => { onClose(); openStretch(stretchSlot() ?? 'noche') }}>Estirar</button>
            <button type="button" className="ql-chip" onClick={e => activity('rest', undefined, 'Descanso', e)}>Descanso a propósito</button>
            <button type="button" className="ql-chip ghost" onClick={() => goTo('Entrenar')}>Entrenar</button>
          </div>
        </div>}

        {mods.focus && <div className="ql-group">
          <h3><Icon name="enfoque" size={18} /> Enfoque</h3>
          <div className="ql-row"><button type="button" className="ql-chip ghost" onClick={() => goTo('Enfoque')}>Empezar un bloque</button>
            <button type="button" className="ql-chip ghost" onClick={() => goTo('Tareas')}>Anotar pendiente</button></div>
        </div>}
      </>}
    </section>
  </div>
}
