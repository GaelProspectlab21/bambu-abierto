import { proximosDias } from './lib/tareas'
import { playSound } from './lib/sounds'

/**
 * v12: elegir el día de una tarea. Una tira de 14 días (lo que más se usa, en un toque) y, para algo
 * más lejano, el calendario del teléfono. "Sin fecha" queda al final.
 */
export function DiaPicker({ today, value, onPick, sinFecha = true }: { today: string; value?: string; onPick: (day: string | undefined) => void; sinFecha?: boolean }) {
  const dias = proximosDias(today, 14)
  const lejos = value && !dias.some(d => d.day === value)
  return <div className="dia-picker">
    <div className="dia-tira" role="radiogroup" aria-label="Día de la tarea">{dias.map(d => <button key={d.day} type="button" role="radio" aria-checked={value === d.day} className={value === d.day ? 'on' : ''} onClick={() => { playSound('pick'); onPick(d.day) }}>
      <small>{d.nombre}</small><b>{d.num}</b>
    </button>)}</div>
    <div className="dia-extra">
      <label className={`d-btn white small dia-cal ${lejos ? 'on' : ''}`}>{lejos ? `Otro: ${value}` : 'Otra fecha'}
        <input type="date" min={today} value={lejos ? value : ''} onChange={e => { if (e.target.value) { playSound('pick'); onPick(e.target.value) } }} aria-label="Elegir otra fecha" />
      </label>
      {sinFecha && <button type="button" className={`d-btn white small ${value === undefined ? 'on' : ''}`} onClick={() => onPick(undefined)}>Sin fecha</button>}
    </div>
  </div>
}
