import { useCallback, useEffect, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import type { Dir } from './lib/perfil'
import { borrarDuelo, crearDuelo, cuenta, cuentaActiva, duelos, responderDuelo, type Duelo } from './lib/nube'
import { DUELO_EJ, DUELO_SEG, abiertoCon, estadoDe, rivalDe, visibles } from './lib/duelos'
import { conCamara } from './lib/minutos'
import { CamaraValor } from './Candado'
import { Avatar, type Commit } from './Tablas'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { haptic } from './lib/haptic'
import { relDe, useSocial } from './useSocial'

let cache: { uid: string; at: number; lista: Duelo[] } | null = null

export function cargarDuelos(uid: string, force = false): Promise<Duelo[]> {
  if (!force && cache?.uid === uid && Date.now() - cache.at < 60000) return Promise.resolve(cache.lista)
  return duelos(uid).then(lista => { cache = { uid, at: Date.now(), lista }; return lista })
}

export function useDuelos(uid: string | undefined) {
  const [lista, setLista] = useState<Duelo[] | null>(() => cache && cache.uid === uid ? cache.lista : null)
  const [failed, setFailed] = useState(false)
  const load = useCallback((force = false) => {
    if (!uid) return
    setFailed(false)
    cargarDuelos(uid, force).then(setLista).catch(() => setFailed(true))
  }, [uid])
  useEffect(() => { load() }, [load])
  return { lista, failed, reload: () => load(true) }
}

type Intento = { ej: string; para?: string; id?: string; valor?: number }

export function DuelosCard({ uid, amigos, dirOf, commit, onMessage }: { uid: string; amigos: Dir[]; dirOf: (id: string) => Dir | undefined; commit: Commit; onMessage: (t: string) => void }) {
  const { lista, failed, reload } = useDuelos(uid)
  const [nuevo, setNuevo] = useState(false)
  const [rival, setRival] = useState('')
  const [ej, setEj] = useState(DUELO_EJ[0])
  const [cam, setCam] = useState<Intento | null>(null)
  const [pendiente, setPendiente] = useState<Intento | null>(null)
  const [busy, setBusy] = useState(false)
  const nombre = (id: string) => dirOf(id)?.apodo ?? 'Tu amigo'
  const todos = lista ?? []
  const vis = visibles(todos, uid)

  async function enviar(it: Intento) {
    setBusy(true)
    try {
      const valor = it.valor ?? 0
      if (it.id) {
        await responderDuelo(it.id, valor)
        const d = todos.find(x => x.id === it.id)
        if (d) onMessage(valor > d.deReps ? `¡Ganaste! ${valor} contra ${d.deReps}.` : valor < d.deReps ? `Perdiste ${valor} contra ${d.deReps}. Pide la revancha.` : `Empate a ${valor}.`)
      } else if (it.para) {
        await crearDuelo(it.para, it.ej, valor)
        onMessage(`Hiciste ${valor}. Ahora le toca a ${nombre(it.para)}.`)
      }
      setPendiente(null)
    } catch {
      setPendiente(it)
      onMessage('No se pudo mandar el duelo. Revisa tu señal y vuelve a intentar.')
    } finally { setBusy(false); reload() }
  }
  function alTerminar(valor: number) {
    const c = cam
    setCam(null)
    if (!c) return
    if (valor > 0) { const day = dateKey(); commit(d => conCamara(d, day, c.ej, 'reps', valor)) }
    void enviar({ ...c, valor })
  }
  async function quitar(d: Duelo) {
    if (busy) return
    setBusy(true)
    try { await borrarDuelo(d.id) } catch { onMessage('No se pudo quitar. Revisa tu señal.') } finally { setBusy(false); reload() }
  }
  function retar(para = '', ejercicio = DUELO_EJ[0]) {
    haptic(8)
    setRival(para)
    setEj(ejercicio)
    setNuevo(true)
  }

  const fila = (d: Duelo) => {
    const e = estadoDe(d, uid)
    const otro = rivalDe(d, uid)
    const r = dirOf(otro)
    const mio = d.de === uid ? d.deReps : d.paraReps
    const suyo = d.de === uid ? d.paraReps : d.deReps
    const ejx = d.ejercicio.toLowerCase()
    const titulo = e === 'te-toca' ? `${nombre(otro)} te retó` : e === 'esperando' ? `Retaste a ${nombre(otro)}` : e === 'vencido' ? `Duelo con ${nombre(otro)}` : e === 'gane' ? `Le ganaste a ${nombre(otro)}` : e === 'perdi' ? `${nombre(otro)} te ganó` : `Empate con ${nombre(otro)}`
    const sub = e === 'te-toca' ? `Hizo ${d.deReps} ${ejx} en ${DUELO_SEG} s · te toca` : e === 'esperando' ? `Hiciste ${d.deReps} ${ejx} · espera su turno` : e === 'vencido' ? 'Venció sin respuesta' : `Tú ${mio} · ${nombre(otro)} ${suyo} · ${ejx}`
    return <div className={`d-am-row d-duelo ${e}`} key={d.id}>
      <div className="d-am-who static"><Avatar n={r?.avatar ?? 0} size={46} /><span><b>{titulo}</b><small>{sub}</small></span></div>
      {e === 'te-toca' && <button type="button" className="d-btn green small" disabled={busy} onClick={() => { haptic(8); setCam({ ej: d.ejercicio, id: d.id }) }}>Aceptar</button>}
      {e === 'esperando' && <button type="button" className="d-link" disabled={busy} onClick={() => void quitar(d)}>Cancelar</button>}
      {(e === 'gane' || e === 'perdi' || e === 'empate') && r && <button type="button" className="d-btn white small" onClick={() => retar(otro, d.ejercicio)}>Revancha</button>}
      {e !== 'te-toca' && e !== 'esperando' && <button type="button" className="d-x" disabled={busy} aria-label="Quitar" onClick={() => void quitar(d)}>×</button>}
    </div>
  }

  const ocupado = rival ? abiertoCon(todos, uid, rival) : false
  return <div className="d-card d-duelos">
    <div className="d-am-title"><h2>Duelos</h2>{amigos.length > 0 && <button type="button" className="d-btn green small" onClick={() => retar()}>Retar</button>}</div>
    {failed && <p className="d-hint">No se pudieron cargar los duelos. Revisa tu señal.</p>}
    {pendiente && <button type="button" className="d-btn blue wide small" disabled={busy} onClick={() => void enviar(pendiente)}>Mandar otra vez mis {pendiente.valor ?? 0}</button>}
    {lista && !vis.length && <p className="d-hint left">{amigos.length ? `Reta a un amigo: los dos hacen el mismo ejercicio ${DUELO_SEG} segundos con la cámara y gana quien haga más.` : 'Cuando tengas amigos podrás retarlos a duelos de 60 segundos con la cámara.'}</p>}
    {vis.map(fila)}

    {nuevo && <Sheet title="Nuevo duelo" onClose={() => setNuevo(false)}>
      <p className="d-tb-sub">¿A quién retas?</p>
      <div className="d-chips">{amigos.map(a => <button key={a.uid} type="button" className={rival === a.uid ? 'on' : ''} onClick={() => setRival(a.uid)}>{a.apodo}</button>)}</div>
      <p className="d-tb-sub">¿Qué ejercicio?</p>
      <div className="d-chips">{DUELO_EJ.map(x => <button key={x} type="button" className={ej === x ? 'on' : ''} onClick={() => setEj(x)}>{x}</button>)}</div>
      <p className="d-hint left"><DuoIcon name="camara" size={20} /> Tú vas primero: {DUELO_SEG} segundos con la cámara. Luego tu amigo tiene 2 días para superarte.</p>
      {ocupado && <p className="d-hint left">Ya tienes un duelo abierto con {nombre(rival)}. Espera su turno.</p>}
      <button type="button" className="d-btn green wide" disabled={!rival || ocupado} onClick={() => { setNuevo(false); setCam({ ej, para: rival }) }}>Empezar mis {DUELO_SEG} s</button>
    </Sheet>}
    {cam && <CamaraValor ej={cam.ej} limite={DUELO_SEG} onCerrar={() => setCam(null)} onValor={alTerminar} />}
  </div>
}

export function useDuelosToca(): number {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const { lista } = useDuelos(uid)
  return uid && lista ? lista.filter(d => estadoDe(d, uid) === 'te-toca').length : 0
}

export function DuelosPage({ data, commit, onMessage, onAmigos }: { data: AppData; commit: Commit; onMessage: (t: string) => void; onAmigos?: () => void }) {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const joined = !!data.settings.tablas
  const amigos = data.settings.amigos ?? []
  const aceptados = data.settings.tablas?.privada ? data.settings.aprobados ?? [] : null
  const { social, failed } = useSocial(uid, amigos, !!uid && joined)
  const como = <div className="d-card">
    <h2>Cómo funciona</h2>
    <ul className="d-duelo-como">
      <li>Eliges amigo y ejercicio, y haces {DUELO_SEG} segundos con la cámara.</li>
      <li>Tu amigo tiene 2 días para hacer los suyos. Gana quien haga más.</li>
      <li>Media repetición vale cero. Los duelos no dan minutos de redes.</li>
    </ul>
  </div>
  if (!uid || !joined) return <section className="d-redes">
    <div className="d-card d-am-empty">
      <DuoIcon name="espada" size={64} />
      <h2>Duelos con amigos</h2>
      <p className="d-hint">Para retar a tus amigos necesitas cuenta y perfil.</p>
      {onAmigos && <button type="button" className="d-btn green wide" onClick={onAmigos}>Ir a Amigos</button>}
    </div>
    {como}
  </section>
  const mutuos = (social?.dir ?? []).filter(d => d.uid !== uid && amigos.includes(d.uid) && relDe(uid, amigos, d, social, aceptados) === 'amigos')
  return <section className="d-redes">
    {failed && <p className="d-hint">No se pudo cargar. Revisa tu señal.</p>}
    {!social && !failed && <p className="d-hint">Cargando…</p>}
    {social && <DuelosCard uid={uid} amigos={mutuos} dirOf={id => social.dir.find(d => d.uid === id)} commit={commit} onMessage={onMessage} />}
    {social && !mutuos.length && onAmigos && <button type="button" className="d-btn white wide" onClick={onAmigos}>Agregar amigos</button>}
    {como}
  </section>
}
