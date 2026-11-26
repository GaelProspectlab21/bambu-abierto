import type { DayHit, WeekBoss, BossWeek } from './lib/jefe'
import { HIT } from './lib/jefe'
import { fmtDay } from './ui'
import { Sheet } from './Sheet'
import { DuoIcon, type DuoIconName } from './DuoIcons'

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function DayRow({ h }: { h: DayHit }) {
  const bits = [h.sets ? `${h.sets} ${h.sets === 1 ? 'serie' : 'series'}${h.armor ? ' (armadura)' : ''}` : '', h.walk ? 'caminaste' : '', h.read ? 'leíste' : '', h.routine ? 'rutina' : '', h.dungeon ? 'mazmorra' : ''].filter(Boolean)
  return <li><span>{WEEK[(new Date(`${h.day}T12:00:00`).getDay() + 6) % 7]}</span><b>{bits.length ? bits.join(' · ') : 'Nada'}{h.crit ? ' · ¡crítico!' : ''}</b><em>{h.total ? `−${h.total}` : '—'}</em></li>
}

export function BossSheet({ wb, onClose }: { wb: WeekBoss & { history: BossWeek[]; wins: number }; onClose: () => void }) {
  const rules: [DuoIconName, string, string][] = [
    ['pesa', 'Cada serie', `−${HIT.set}`],
    ['caminar', 'Caminata del día · rompe su armadura', `−${HIT.walk}`],
    ['libro', 'Leer · le quitas el escudo', `−${HIT.read}`],
    ['check', 'Rutina completa', `−${HIT.routine}`],
    ['cofre', 'Mazmorra superada', `−${HIT.dungeon}`],
    ['sol', 'Buenos días completo · golpe crítico', `×${HIT.crit}`],
  ]
  return <Sheet title="Jefe de la semana" tall onClose={onClose}>
    <div className="d-goal-top"><b>{wb.monster.name}</b><span>{wb.defeatedDay ? `Vencido ${['hoy', 'ayer'].includes(fmtDay(wb.defeatedDay)) ? fmtDay(wb.defeatedDay) : `el ${fmtDay(wb.defeatedDay)}`}` : `${wb.monster.hp - wb.dealt} de ${wb.monster.hp} de vida`}</span></div>
    <div className="d-hp"><span style={{ width: `${(wb.monster.hp - wb.dealt) / wb.monster.hp * 100}%` }} /></div>
    <p className="d-hint left">{wb.monster.title}. Solo le pegan tus hábitos de la semana. Si llega el domingo y sigue vivo, se escapa. Vencerlo da +100 XP.</p>
    <h3 className="d-sheet-h3">Cómo pegarle</h3>
    <ul className="d-xp-table">{rules.map(([icon, text, v]) => <li key={text}><DuoIcon name={icon} size={26} /><span>{text}</span><b>{v}</b></li>)}</ul>
    <p className="d-hint left">Si entrenas sin haber caminado ese día, su armadura aguanta y tus series pegan la mitad.</p>
    <h3 className="d-sheet-h3">Esta semana</h3>
    <ul className="d-boss-days">{wb.days.map(h => <DayRow key={h.day} h={h} />)}</ul>
    {wb.history.length > 0 && <>
      <h3 className="d-sheet-h3">Jefes anteriores · {wb.wins} vencidos</h3>
      <ul className="d-read-list">{wb.history.map(x => <li key={x.monday}><span>{fmtDay(x.monday)}</span><b>{x.name}</b><em className={x.defeated ? 'win' : 'lose'}>{x.defeated ? 'Vencido' : 'Se escapó'}</em></li>)}</ul>
    </>}
    <p className="d-hint left">Cada jefe que vences hace al siguiente un poco más fuerte.</p>
  </Sheet>
}
