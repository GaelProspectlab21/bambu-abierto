import { useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { aplicarDiagnostico, escalonPara, PRUEBAS } from './lib/diagnostico'
import { pasoDe, SLOT_LABEL, type Slot } from './lib/exercises'
import { BroteArt } from './BroteArt'
import { Sheet } from './Sheet'
import { haptic } from './lib/haptic'

type Commit = (update: (d: AppData) => AppData) => void

/** Tarjeta de entrada: invita al diagnóstico si nunca lo hiciste, o deja repetirlo. */
export function DiagnosticoCard({ data, onOpen }: { data: AppData; onOpen: () => void }) {
  const hecho = data.settings.diagnostico
  if (hecho) return <button type="button" className="d-link diag-repetir" onClick={onOpen}>Repetir mi diagnóstico de fuerza</button>
  return <section className="d-card diag-card">
    <BroteArt mood="animo" look="coach" size={84} />
    <div>
      <h2>Antes de entrenar: tu diagnóstico</h2>
      <p>Cinco preguntas, dos minutos. Con eso arranco cada ejercicio en el escalón que sí te sale con buena técnica.</p>
      <button type="button" className="d-btn green" onClick={() => { haptic(10); onOpen() }}>Hacer mi diagnóstico</button>
    </div>
  </section>
}

/** Una pregunta por pantalla; al final, dónde arrancas en cada patrón. */
export function DiagnosticoSheet({ data, commit, onClose, onMessage }: { data: AppData; commit: Commit; onClose: () => void; onMessage: (t: string) => void }) {
  const [i, setI] = useState(0)
  const [resp, setResp] = useState<Partial<Record<Slot, number>>>({})
  const fin = i >= PRUEBAS.length
  const p = PRUEBAS[i]
  function elegir(k: number) {
    haptic(8)
    setResp(r => ({ ...r, [p.slot]: k }))
    setI(i + 1)
  }
  function guardar() {
    haptic([12, 30, 12])
    commit(d => aplicarDiagnostico(d, resp, dateKey()))
    onMessage('Listo. Tu sesión ya arranca en tus escalones.')
    onClose()
  }
  return <Sheet title="Tu diagnóstico" tall onClose={onClose}>
    <div className="diag">
      <div className="diag-progreso" aria-hidden="true">{PRUEBAS.map((x, k) => <i key={x.slot} className={k < i ? 'on' : k === i ? 'now' : ''} />)}</div>
      {!fin ? <>
        <div className="diag-head"><BroteArt mood="animo" look="coach" size={72} /><p className="diag-eyebrow">{SLOT_LABEL[p.slot]} · {i + 1} de {PRUEBAS.length}</p></div>
        <h2>{p.pregunta}</h2>
        <p className="diag-como">{p.como} Contesta lo que te sale hoy, no lo que te gustaría.</p>
        <div className="diag-opciones">{p.opciones.map((o, k) => <button key={o.label} type="button" className={`d-btn white wide ${resp[p.slot] === k ? 'on' : ''}`} onClick={() => elegir(k)}>{o.label}</button>)}</div>
        {i > 0 && <button type="button" className="d-link" onClick={() => setI(i - 1)}>Atrás</button>}
      </> : <>
        <div className="diag-head"><BroteArt mood="orgulloso" look="coach" size={84} /><p className="diag-eyebrow">Así arrancas</p></div>
        <h2>Tu punto de partida</h2>
        <ul className="diag-resultado">{PRUEBAS.map(x => {
          const k = resp[x.slot]
          const e = k === undefined ? undefined : escalonPara(x.opciones[k].id, data.settings.equipment)
          const paso = e ? pasoDe(e.id) : null
          return <li key={x.slot}><span>{SLOT_LABEL[x.slot]}</span><b>{e?.name ?? 'Sin contestar'}</b>{paso && <small>Paso {paso.n} de {paso.total}</small>}</li>
        })}</ul>
        <p className="diag-como">Cuando llegues al tope de repeticiones en todas tus series, subes un escalón. Si un día no te sale con técnica, bajas uno sin pena: así se aprende.</p>
        <button type="button" className="d-btn green wide" onClick={guardar}>Guardar y entrenar</button>
        <button type="button" className="d-link" onClick={() => setI(0)}>Volver a contestar</button>
      </>}
    </div>
  </Sheet>
}
