import { useEffect, useMemo, useRef } from 'react'
import { activeHabits, cleanReminders, dateKey, modulesOf, type AppData } from './lib/model'
import { game } from './lib/gamification'
import { todayPlan, shift } from './lib/coach'
import { bedtime } from './lib/reminders'
import { realReading } from './lib/progress'
import { BroteArt } from './Brote'
import { habitDone } from './HabitsPage'
import { haptic } from './lib/haptic'
import { GivenBar } from './GivenBar'
import { verdict } from './lib/measure'

const KEY = 'bambu.closed'
export function closedToday(): boolean { try { return localStorage.getItem(KEY) === dateKey() } catch { return false } }
export function markClosed(): void { try { localStorage.setItem(KEY, dateKey()) } catch { /* el aviso reaparece, no pasa nada */ } }

/** Hoja de cierre: todo lo que hiciste hoy en una pantalla, el nudo ganado y lo de mañana. */
export function ClosingSheet({ data, onClose, day }: { data: AppData; onClose: () => void; day?: string }) {
  const today = day ?? dateKey()
  const g = useMemo(() => game(data, today), [data, today])
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const readSec = data.reading.filter(r => r.day === today && realReading(r)).reduce((s, r) => s + (r.seconds ?? r.minutes * 60), 0)
  const sets = data.sets.filter(s => s.day === today).length
  const focus = data.focus.filter(f => f.day === today).reduce((s, f) => s + f.minutes, 0)
  const habits = activeHabits(data.settings)
  const hDone = habits.filter(h => habitDone(data, h, today)).length
  const solid = g.week.days.find(d => d.day === today)?.good
  const row = data.checkins.find(c => c.day === today)
  const measured = row?.capacity !== undefined && row.given !== undefined ? { capacity: row.capacity, given: row.given } : null
  const tomorrow = todayPlan(data, new Date(`${shift(today, 1)}T12:00:00`).getTime())
  const r = cleanReminders(data.settings.reminders)
  const mod = modulesOf(data.settings)
  const rows: [string, string][] = [
    ...(mod.reading ? [['Lectura', readSec ? `${Math.floor(readSec / 60)} min` : 'sin registro'] as [string, string]] : []),
    ...(mod.training ? [['Series', sets ? String(sets) : 'sin registro'] as [string, string]] : []),
    ...(mod.focus ? [['Enfoque', focus ? `${focus} min` : 'sin registro'] as [string, string]] : []),
    ...(habits.length ? [['Hábitos', `${hDone} de ${habits.length}`] as [string, string]] : []),
    ['Misiones', `${g.questsDone} de ${g.quests.length}`],
  ]
  return <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="closing-title">
      <div className="sheet-head"><BroteArt mood={g.dayComplete ? 'orgulloso' : 'sueno'} size={84} />
        <div><span className="eyebrow">CIERRE DEL DÍA</span><h2 id="closing-title">{measured && measured.given >= measured.capacity - 5 ? 'Diste lo que traías.' : g.dayComplete ? 'Día completo.' : solid ? 'Día sólido.' : 'Hoy fue lo que fue.'}</h2>
          <p>{solid ? 'Ganaste un nudo en tu bambú de la semana.' : 'Un día sin nudo no rompe nada. Mañana se siembra otro.'}</p></div></div>
      {measured && <><GivenBar capacity={measured.capacity} given={measured.given} /><p className="hint">{verdict(measured.capacity, measured.given).text}</p></>}
      <dl className="sheet-rows">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>XP de hoy</dt><dd>+{g.todayXp}</dd></div></dl>
      {mod.training ? <div className="sheet-tomorrow"><span className="eyebrow">MAÑANA</span><strong>{{ torso: 'Torso', pierna: 'Pierna y core', futbol: 'Fútbol', descanso: 'Descanso activo', dolor: 'Revisa tu check-in' }[tomorrow.kind]}</strong><p>{tomorrow.kind === 'descanso' || tomorrow.kind === 'futbol' ? tomorrow.summary : 'Lo que toca lo armo con tu check-in de la mañana.'}</p></div>
        : <div className="sheet-tomorrow"><span className="eyebrow">MAÑANA</span><strong>Otra medida nueva</strong><p>Mañana te preguntas con cuánto amaneciste. Hoy ya cerraste.</p></div>}
      <p className="sheet-bed">A la cama a las <b>{bedtime(r, data.settings.sleepTarget)}</b>.{mod.training ? ' El músculo crece mientras duermes.' : ''}</p>
      <button ref={close} className="primary-button" onClick={() => { markClosed(); haptic([20, 40, 20]); onClose() }}>Cerrar el día <span>✓</span></button>
    </div>
  </div>
}
