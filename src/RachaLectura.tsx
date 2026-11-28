import { useEffect, useMemo } from 'react'
import { dateKey, type AppData } from './lib/model'
import { DIAS_POR_ESCUDO, MAX_ESCUDOS, hitoAlcanzado, rachaDe } from './lib/rachaLectura'
import { DuoIcon } from './DuoIcons'
import { celebrate } from './ui'
import { plural } from './lib/text'

const LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** v12: la cabecera de Lectura. La racha grande, la semana día por día, tus escudos y el siguiente hito. */
export function RachaLecturaCard({ data, onLeer }: { data: AppData; onLeer?: () => void }) {
  const today = dateKey()
  const r = useMemo(() => rachaDe(data, today), [data, today])
  const pct = r.hito ? Math.round((r.actual - hitoAlcanzado(r.actual)) / (r.hito - hitoAlcanzado(r.actual)) * 100) : 100
  const frase = r.hoyHecho ? (r.hito ? `Hoy ya cuenta. ${plural(r.faltan, 'día', 'días')} para llegar a ${r.hito}.` : 'Hoy ya cuenta. Eres leyenda.')
    : r.actual === 0 ? 'Cinco minutos hoy y arranca tu racha.'
      : r.escudos > 0 ? `Lee hoy y llegas a ${r.actual + 1}. Si se te va, un escudo te cubre.`
        : `Lee hoy y llegas a ${r.actual + 1}. Hoy no tienes escudo.`
  return <section className={`racha-lect ${r.hoyHecho ? 'hecho' : ''} ${r.enRiesgo ? 'riesgo' : ''}`} aria-label="Tu racha de lectura">
    <div className="rl-top">
      <div className="rl-num"><DuoIcon name="fuego" size={44} off={!r.hoyHecho} /><b>{r.actual}</b><span>{r.actual === 1 ? 'día leyendo' : 'días leyendo'}</span></div>
      <div className="rl-escudos" aria-label={`${r.escudos} de ${MAX_ESCUDOS} escudos`}>
        {Array.from({ length: MAX_ESCUDOS }, (_, i) => <span key={i} className={i < r.escudos ? 'on' : ''}><DuoIcon name="escudo" size={28} off={i >= r.escudos} /></span>)}
        <small>{r.escudos >= MAX_ESCUDOS ? 'escudos llenos' : `escudo en ${plural(r.paraEscudo, 'día', 'días')}`}</small>
      </div>
    </div>
    <ol className="rl-semana">{r.semana.map(d => <li key={d.day} className={d.estado} aria-label={`${d.day}: ${d.estado === 'leido' ? 'leíste' : d.estado === 'protegido' ? 'cubierto por un escudo' : d.estado === 'hoy' ? 'hoy, pendiente' : d.estado === 'falta' ? 'no leíste' : 'antes de empezar'}`}>
      <small>{LETRA[new Date(`${d.day}T12:00:00`).getDay()]}</small>
      <i>{d.estado === 'leido' ? <DuoIcon name="check" size={18} /> : d.estado === 'protegido' ? <DuoIcon name="escudo" size={18} /> : null}</i>
    </li>)}</ol>
    {r.hito && <div className="rl-hito"><span>Siguiente meta: <b>{r.hito} días</b></span><div className="rl-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></div></div>}
    <p className="rl-frase">{frase}</p>
    {!r.hoyHecho && onLeer && <button type="button" className="d-btn green wide" onClick={onLeer}>Leer ahora</button>}
    <p className="rl-mejor">Mejor racha: {r.mejor}. Cada {DIAS_POR_ESCUDO} días seguidos ganas un escudo.</p>
  </section>
}

/** Festeja hitos y escudos UNA vez (lo ganado se celebra; abrir la app no). Lo monta App. */
export function HitosLectura({ data }: { data: AppData }) {
  const r = useMemo(() => rachaDe(data, dateKey()), [data])
  useEffect(() => {
    try {
      const h = hitoAlcanzado(r.actual), visto = localStorage.getItem('bambu.hito.lectura')
      if (visto === null) localStorage.setItem('bambu.hito.lectura', String(h))
      else if (h > Number(visto)) {
        localStorage.setItem('bambu.hito.lectura', String(h))
        celebrate({ kind: 'streak', count: h, title: `¡${h} días leyendo!`, text: h >= 30 ? 'Esto ya es parte de quien eres.' : 'Lo que repites echa raíces.' })
      }
      const esc = localStorage.getItem('bambu.escudos.lectura')
      if (esc !== null && r.escudos > Number(esc)) celebrate({ kind: 'achievement', title: 'Ganaste un escudo', text: 'Si un día se te va, cubre tu racha solo.', sound: 'gold' })
      localStorage.setItem('bambu.escudos.lectura', String(r.escudos))
    } catch { /* sin almacenamiento no hay festejo, la racha sigue igual */ }
  }, [r.actual, r.escudos])
  return null
}
