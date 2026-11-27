import { useCallback, useEffect, useState } from 'react'
import type { AppData } from './lib/model'
import { supabase } from './lib/supabase'
import { tabla, miSemana, type Publicado } from './lib/tablaSemana'
import { aceptarAmistad, buscarPorCodigo, cancelarSolicitud, miPerfil, pedirAmistad, pendientes, publicarMiSemana, quitarAmigo, semanaDeAmigos, type MiPerfil, type Pendiente } from './lib/amigosNube'
import { AMIGO_KEY } from './Amigos'
import { haptic } from './lib/haptic'
import { DuoIcon } from './DuoIcons'

type Props = { data: AppData; onMessage: (t: string) => void }

/**
 * Amigos en una pantalla: tu código, agregar por código, solicitudes y la tabla de la semana.
 * Regla del juego: círculo cerrado 1 punto, de oro 2. Gana quien junte más; también gana quien más mejoró.
 */
export function AmigosSimple({ data, onMessage }: Props) {
  const [uid, setUid] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<MiPerfil | 'cargando'>('cargando')
  const [lista, setLista] = useState<Publicado[]>([])
  const [pend, setPend] = useState<{ entrantes: Pendiente[]; salientes: Pendiente[] }>({ entrantes: [], salientes: [] })
  const [error, setError] = useState('')
  const [apodo, setApodo] = useState(data.settings.tablas?.apodo ?? data.profile.name ?? '')
  const [codigo, setCodigo] = useState(() => { try { return localStorage.getItem(AMIGO_KEY) ?? '' } catch { return '' } })
  const [hallado, setHallado] = useState<{ apodo: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async (id: string) => {
    setError('')
    try {
      const p = await miPerfil(id)
      setPerfil(p)
      if (!p) return
      await publicarMiSemana(data, id)
      const [l, pe] = await Promise.all([semanaDeAmigos(), pendientes(id)])
      setLista(l); setPend(pe)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar.') }
  }, [data])
  useEffect(() => { void supabase?.auth.getUser().then(({ data: u }) => { if (u.user) { setUid(u.user.id); void cargar(u.user.id) } }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function crear() {
    if (!uid || !apodo.trim()) return
    setBusy(true)
    try { await publicarMiSemana(data, uid, apodo); await cargar(uid); onMessage('Listo. Ya tienes tu código.') } catch (e) { onMessage(e instanceof Error ? e.message : 'No se pudo.') }
    setBusy(false)
  }
  async function buscar() {
    const c = codigo.trim().toUpperCase()
    if (c.length !== 8) { onMessage('El código tiene 8 letras y números.'); return }
    setBusy(true)
    try { const r = await buscarPorCodigo(c); setHallado(r); if (!r) onMessage('No encontramos ese código. Revísalo con tu amigo.') } catch (e) { onMessage(e instanceof Error ? e.message : 'No se pudo buscar.') }
    setBusy(false)
  }
  async function pedir() {
    if (!uid) return
    setBusy(true)
    try {
      await pedirAmistad(uid, codigo.trim().toUpperCase())
      haptic([12, 30, 12])
      onMessage(`Solicitud enviada a ${hallado?.apodo}. Cuando acepte, aparece en tu tabla.`)
      setCodigo(''); setHallado(null); try { localStorage.removeItem(AMIGO_KEY) } catch { /* sin almacenamiento */ }
      await cargar(uid)
    } catch (e) { onMessage(e instanceof Error ? e.message : 'No se pudo mandar.') }
    setBusy(false)
  }
  async function responder(p: Pendiente, si: boolean) {
    if (!uid) return
    try { if (si) await aceptarAmistad(p.uid); else await cancelarSolicitud(p.uid, uid); onMessage(si ? `¡Ya son amigos con ${p.apodo}!` : 'Solicitud rechazada.'); await cargar(uid) } catch (e) { onMessage(e instanceof Error ? e.message : 'No se pudo.') }
  }
  async function quitar(otro: string, nombre: string) {
    if (!uid || !window.confirm(`¿Quitar a ${nombre} de tus amigos?`)) return
    try { await quitarAmigo(uid, otro); onMessage(`Quitaste a ${nombre}.`); await cargar(uid) } catch (e) { onMessage(e instanceof Error ? e.message : 'No se pudo.') }
  }
  async function compartir(c: string) {
    const url = `${window.location.origin}/?amigo=${c}`
    const text = `Agrégame en bambú. Mi código: ${c}`
    try { if (navigator.share) await navigator.share({ title: 'bambú', text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); onMessage('Copiado. Pégalo donde quieras.') } } catch { /* cancelado */ }
  }

  if (!supabase) return <section className="d-page"><div className="d-card am-card"><h2 className="fb-title">Amigos</h2><p className="d-hint left">Para tener amigos necesitas una cuenta. En modo sin cuenta todo vive solo en este teléfono.</p></div></section>
  if (perfil === 'cargando') return <section className="d-page"><div className="d-card am-card"><p className="d-hint">{error || 'Cargando tus amigos.'}</p>{error && uid && <button type="button" className="d-btn white" onClick={() => void cargar(uid)}>Reintentar</button>}</div></section>

  if (!perfil) return <section className="d-page">
    <div className="d-card am-card">
      <h2 className="fb-title">Crece con tus amigos</h2>
      <p className="am-rule">Cierra tus 3 círculos. Si te queda, hazlos de oro. Gana quien junte más círculos en la semana.</p>
      <p className="d-hint left">Tus amigos solo ven tu apodo, tus puntos y tu racha. Nunca lo que lees, tus tareas ni tu peso. Solo te encuentran con tu código.</p>
      <input className="d-input" value={apodo} maxLength={24} onChange={e => setApodo(e.target.value)} placeholder="Tu apodo" />
      <button type="button" className="d-btn green wide" disabled={!apodo.trim() || busy} onClick={() => void crear()}>Crear mi código</button>
    </div>
  </section>

  const { filas, lider, mejoro } = tabla(lista, uid ?? '')
  const yo = miSemana(data)
  const solo = filas.length <= 1
  return <section className="d-page am">
    <div className="d-card am-card">
      <div className="fb-label">Tabla de la semana · se reinicia el lunes</div>
      {solo ? <p className="d-hint left">Agrega a un amigo con su código para empezar a competir. Mientras, llevas <b>{yo.puntos}</b> puntos esta semana.</p>
        : <ol className="am-tabla">{filas.map(f => <li key={f.uid} className={f.yo ? 'yo' : ''}>
          <span className="am-lugar">{f.lugar}</span>
          <span className="am-nombre"><b>{f.yo ? 'Tú' : f.apodo}</b><small>{[f.uid === lider ? 'Va ganando' : '', f.uid === mejoro ? 'El que más mejoró' : '', f.oros ? `${f.oros} de oro` : '', f.racha ? `racha ${f.racha}` : ''].filter(Boolean).join(' · ')}</small></span>
          <span className="am-pts"><b>{f.puntos}</b><small>pts</small></span>
          {!f.yo && <button type="button" className="d-x small" aria-label={`Quitar a ${f.apodo}`} onClick={() => void quitar(f.uid, f.apodo)}>×</button>}
        </li>)}</ol>}
      <p className="d-hint left">Círculo cerrado 1 punto. De oro 2. Máximo 6 al día.</p>
    </div>

    {pend.entrantes.length > 0 && <div className="d-card am-card">
      <div className="fb-label">Te quieren agregar</div>
      {pend.entrantes.map(p => <div key={p.uid} className="am-sol"><b>{p.apodo}</b><button type="button" className="d-btn green" onClick={() => void responder(p, true)}>Aceptar</button><button type="button" className="d-link" onClick={() => void responder(p, false)}>No</button></div>)}
    </div>}

    <div className="d-card am-card">
      <div className="fb-label">Agregar amigo</div>
      <div className="fb-add">
        <input className="d-input am-code" value={codigo} maxLength={8} autoCapitalize="characters" onChange={e => { setCodigo(e.target.value.toUpperCase()); setHallado(null) }} placeholder="Su código" />
        <button type="button" className="d-btn white" disabled={busy || codigo.trim().length !== 8} onClick={() => void buscar()}>Buscar</button>
      </div>
      {hallado && <div className="am-sol"><b>{hallado.apodo}</b><button type="button" className="d-btn green" disabled={busy} onClick={() => void pedir()}>Mandar solicitud</button></div>}
      {pend.salientes.map(p => <div key={p.uid} className="am-sol pend"><span>Esperando a <b>{p.apodo}</b></span><button type="button" className="d-link" onClick={() => uid && void cancelarSolicitud(uid, p.uid).then(() => cargar(uid))}>Cancelar</button></div>)}
    </div>

    <div className="d-card am-card am-mio">
      <div className="fb-label">Tu código</div>
      <div className="am-mio-row"><output className="am-codigo">{perfil.codigo}</output><button type="button" className="d-btn blue" onClick={() => void compartir(perfil.codigo)}><DuoIcon name="amigos" size={24} /> Compartir</button></div>
      <p className="d-hint left">Apodo: {perfil.apodo}. Solo con este código te pueden encontrar.</p>
    </div>
    {error && <p className="d-hint">{error}</p>}
  </section>
}
