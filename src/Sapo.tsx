import { useState } from 'react'
import type { AppData } from './lib/model'
import { marcarSapo, sapoDe } from './lib/tareas'
import { XP } from './lib/xp'
import { haptic } from './lib/haptic'

type Commit = (update: (d: AppData) => AppData) => void
const INK = '#151515'

/** El sapo, con el mismo trazo a plumón que Brote. `comido` lo pone con la panza llena y los ojos cerrados. */
export function SapoArt({ size = 64, comido = false }: { size?: number; comido?: boolean }) {
  return <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
    <defs><filter id="sapo-w" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="2" /></filter></defs>
    <ellipse cx="50" cy="88" rx="32" ry="4" fill="#000" opacity=".25" />
    <g filter="url(#sapo-w)" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 84c-6-2-8-8-4-12M82 84c6-2 8-8 4-12" fill="none" />
      <path d="M14 70c0-20 16-34 36-34s36 14 36 34c0 12-14 18-36 18S14 82 14 70Z" fill="#8a9a3a" />
      <path d="M30 76c4 6 12 8 20 8s16-2 20-8" fill={comido ? '#e4c46a' : '#c9b46a'} />
      <circle cx="33" cy="36" r="11" fill="#8a9a3a" /><circle cx="67" cy="36" r="11" fill="#8a9a3a" />
    </g>
    {comido
      ? <path d="M27 37q6 4 12 0M61 37q6 4 12 0" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      : <><circle cx="33" cy="37" r="4.2" fill={INK} /><circle cx="67" cy="37" r="4.2" fill={INK} /><path d="M24 26l14 4M76 26l-14 4" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>}
    <path d={comido ? 'M38 60q12 8 24 0' : 'M36 62q14-5 28 0'} stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <circle cx="44" cy="50" r="1.6" fill={INK} /><circle cx="56" cy="50" r="1.6" fill={INK} />
  </svg>
}

/**
 * La tarjeta del sapo en Tareas. Sin sapo: invita a elegirlo y explica qué es.
 * Con sapo: lo pone enfrente con un botón para comértelo en un bloque.
 */
export function SapoCard({ data, commit, today, eligiendo, onElegir, onComer, onHecho }: {
  data: AppData; commit: Commit; today: string; eligiendo: boolean
  onElegir: () => void; onComer: (task: { id: string; text: string }) => void; onHecho: (el: HTMLElement, id: string) => void
}) {
  const sapo = sapoDe(data, today)
  const [porQue, setPorQue] = useState(false)
  const comido = sapo?.status === 'done'
  if (!sapo) return <section className={`d-card sapo-card ${eligiendo ? 'eligiendo' : ''}`}>
    <SapoArt size={58} />
    <div className="sapo-text">
      <h2>{eligiendo ? 'Toca tu sapo en la lista' : '¿Cuál es tu sapo de hoy?'}</h2>
      <p>{eligiendo ? 'La que más flojera o miedo te da. Esa.' : 'La tarea más difícil del día. Si te la comes primero, lo demás se siente fácil.'}</p>
      <div className="sapo-actions">
        <button type="button" className="d-btn green" onClick={() => { haptic(10); onElegir() }}>{eligiendo ? 'Cancelar' : 'Elegir mi sapo'}</button>
        {!eligiendo && <button type="button" className="d-link" onClick={() => setPorQue(!porQue)}>{porQue ? 'Ocultar' : '¿Por qué un sapo?'}</button>}
      </div>
      {porQue && <p className="sapo-why">Dicen que si lo primero que haces en la mañana es comerte un sapo vivo, nada peor te va a pasar en el día. Brian Tracy lo volvió método: la tarea que más evitas suele ser la que más mueve tu semana. Elige una sola, hazla antes que todo lo demás y el resto del día se siente cuesta abajo. Comértelo vale +{XP.sapo} XP extra.</p>}
    </div>
  </section>
  return <section className={`d-card sapo-card on ${comido ? 'comido' : ''}`}>
    <SapoArt size={58} comido={comido} />
    <div className="sapo-text">
      <p className="sapo-eyebrow">{comido ? 'Te comiste tu sapo' : 'Tu sapo de hoy'}</p>
      <h2>{sapo.text}</h2>
      {comido
        ? <p>Lo difícil ya pasó. Lo demás es de bajada.</p>
        : <div className="sapo-actions">
          <button type="button" className="d-btn green" onClick={() => { haptic([12, 30, 12]); onComer({ id: sapo.id, text: sapo.text }) }}>Comérmelo ahora</button>
          <button type="button" className="d-btn white" onClick={e => onHecho(e.currentTarget, sapo.id)}>Ya lo hice</button>
          <button type="button" className="d-link" onClick={() => commit(d => marcarSapo(d, sapo.id, today))}>Cambiar</button>
        </div>}
    </div>
  </section>
}
