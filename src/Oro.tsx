import { useState } from 'react'
import type { AppData } from './lib/model'
import { EXTRAS, RING_NAME, hacerExtra, type Ring } from './lib/oro'
import { Sheet } from './Sheet'
import { HoldButton } from './Vara'
import { celebrate } from './ui'
import { haptic } from './lib/haptic'

type Commit = (update: (d: AppData) => AppData) => void

/** La invitación bajo los círculos: aparece solo cuando cerraste uno que todavía no es de oro. */
export function OroInvite({ ring, onOpen }: { ring: Ring; onOpen: () => void }) {
  return <button type="button" className="d-oro-invite" onClick={() => { haptic(12); onOpen() }}>
    <span><b>Cerraste {RING_NAME[ring]}.</b> ¿Te queda 40%?</span><i aria-hidden="true">Hazlo de oro</i>
  </button>
}

/** Un extra chico, se hace y se sella manteniendo presionado. Nada al azar: se gana. */
export function OroSheet({ ring, day, commit, onClose }: { ring: Ring; day: string; commit: Commit; onClose: () => void }) {
  const [pick, setPick] = useState(EXTRAS[ring][0])
  return <Sheet title={`${RING_NAME[ring]} de oro`} onClose={onClose}>
    <p className="d-hint left">Cuando tu cabeza dice "ya acabé", te queda 40%. Elige uno, hazlo ahora y séllalo.</p>
    <div className="d-chips">{EXTRAS[ring].map(x => <button key={x} type="button" className={pick === x ? 'on' : ''} aria-pressed={pick === x} onClick={() => setPick(x)}>{x}</button>)}</div>
    <HoldButton label={`Ya lo hice: ${pick.toLowerCase()}`} done="¡De oro!" onDone={() => {
      commit(d => hacerExtra(d, ring, pick, day))
      celebrate({ kind: 'achievement', title: `¡${RING_NAME[ring]} de oro!`, text: 'Diste más de lo que pensabas que tenías. Vale 2 puntos.' })
      window.setTimeout(onClose, 500)
    }} />
  </Sheet>
}
