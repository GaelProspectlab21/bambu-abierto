import { useEffect, useMemo, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { boards, buildPerfil, ranking, RECORD_EXERCISES, sameStats, type Board, type Dir, type Perfil, type Relacion } from './lib/perfil'
import { borrarPerfil, cuenta, cuentaActiva, publicarPerfil, setLocalOnly } from './lib/nube'
import { MONSTERS } from './lib/aventura'
import { mondayOf } from './lib/libre'
import { MonsterArt } from './Aventura'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { alternar, relDe, useSocial } from './useSocial'

export type Commit = (update: (d: AppData) => AppData) => void
const LAST_KEY = (uid: string) => `bambu.tablas.ultimo.${uid}`
const GROUPS = ['General', 'Semana', 'Récords'] as const

export function fmt(v: number, unit: string): string {
  if (unit === 's') return v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')} min` : `${v} s`
  if (unit === 'km') return `${v.toLocaleString('es-MX', { maximumFractionDigits: 1 })} km`
  return `${v.toLocaleString('es-MX')} ${unit}`
}

export function usePublicarPerfil(data: AppData, uid: string | undefined) {
  useEffect(() => {
    const t = data.settings.tablas
    if (!uid || !t) return
    let last: { at: number; p: Perfil } | null = null
    try { last = JSON.parse(localStorage.getItem(LAST_KEY(uid)) ?? 'null') } catch { last = null }
    const others = (ids?: string[]) => (ids ?? []).filter(id => id !== uid)
    const now = JSON.stringify([t.apodo, t.avatar, others(data.settings.amigos), t.privada !== true, t.privada ? others(data.settings.aprobados) : []])
    const before = last ? JSON.stringify([last.p.apodo, last.p.avatar, last.p.siguiendo ?? [], last.p.publica ?? true, last.p.aprobados ?? []]) : ''
    const urgent = now !== before
    if (!urgent && last && Date.now() - last.at < 60000) return
    const timer = window.setTimeout(() => {
      const mine = buildPerfil(data, uid)
      if (!mine || (last && sameStats(last.p, mine))) return
      publicarPerfil(mine).then(() => { try { localStorage.setItem(LAST_KEY(uid), JSON.stringify({ at: Date.now(), p: mine })) } catch { return } }).catch(() => undefined)
    }, urgent ? 600 : 4000)
    return () => window.clearTimeout(timer)
  }, [data, uid])
}

export function Avatar({ n, size }: { n: number; size: number }) {
  return <span className="d-tb-ava" style={{ width: size, height: size }}><MonsterArt m={MONSTERS[n] ?? MONSTERS[0]} size={size * 0.92} /></span>
}

export function Privacidad({ value, onChange }: { value: boolean | undefined; onChange: (privada: boolean) => void }) {
  return <div className="d-priv" role="radiogroup" aria-label="Tipo de cuenta">
    <button type="button" role="radio" aria-checked={value === false} className={value === false ? 'on' : ''} onClick={() => onChange(false)}>
      <DuoIcon name="amigos" size={34} /><b>Pública</b><small>Cualquiera te puede agregar y ver tus números.</small>
    </button>
    <button type="button" role="radio" aria-checked={value === true} className={value === true ? 'on' : ''} onClick={() => onChange(true)}>
      <DuoIcon name="candado" size={34} /><b>Privada</b><small>Te mandan solicitud y tú decides a quién aceptas.</small>
    </button>
  </div>
}

export function Join({ data, commit, uid, cta }: { data: AppData; commit: Commit; uid: string; cta?: string }) {
  const t = data.settings.tablas
  const [apodo, setApodo] = useState(t?.apodo ?? data.profile.name ?? '')
  const [avatar, setAvatar] = useState(t?.avatar ?? 0)
  const [privada, setPrivada] = useState<boolean | undefined>(t?.privada)
  const clean = apodo.trim().slice(0, 24)
  function save() {
    if (!clean || privada === undefined) return
    try { localStorage.removeItem(LAST_KEY(uid)) } catch { return }
    commit(d => ({ ...d, settings: { ...d.settings, tablas: { apodo: clean, avatar, privada } } }))
  }
  return <div className="d-tb-join">
    <p className="d-hint left">Los demás ven tu apodo y tu monstruo. Nunca tu correo.</p>
    <label className="d-field">Tu apodo<input className="d-input" maxLength={24} value={apodo} onChange={e => setApodo(e.target.value)} placeholder="Cómo te van a ver" /></label>
    <span className="d-field">Tu monstruo</span>
    <div className="d-tb-avas">{MONSTERS.map((m, i) => <button key={m.id} type="button" className={avatar === i ? 'on' : ''} onClick={() => setAvatar(i)} aria-label={m.name}><Avatar n={i} size={54} /></button>)}</div>
    <span className="d-field">Tu cuenta</span>
    <Privacidad value={privada} onChange={setPrivada} />
    <button type="button" className="d-btn green wide" disabled={!clean || privada === undefined} onClick={save}>{t ? 'Guardar' : cta ?? 'Entrar a las tablas'}</button>
  </div>
}

const REL_TEXT: Record<Relacion, string> = { amigos: 'Son amigos', agregado: 'Lo agregaste · falta que te agregue', pendiente: 'Solicitud enviada · espera a que te acepte', teAgrego: 'Te agregó como amigo', nada: '' }

export function FollowButton({ rel, privada, onToggle }: { rel: Relacion; privada?: boolean; onToggle: () => void }) {
  if (rel === 'amigos' || rel === 'agregado') return <button type="button" className="d-btn white small d-follow on" onClick={onToggle}>Quitar</button>
  if (rel === 'pendiente') return <button type="button" className="d-btn white small d-follow on" onClick={onToggle}>Enviada</button>
  return <button type="button" className="d-btn blue small d-follow" onClick={onToggle}>{privada ? 'Solicitar' : 'Agregar'}</button>
}

export function PerfilView({ p, dir, me, rel, onBack, onToggle, back = 'Volver a las tablas' }: { p: Perfil | null; dir: Dir; me: Perfil | null; rel: Relacion; onBack: () => void; onToggle?: () => void; back?: string }) {
  const isMe = me?.uid === dir.uid
  const head = <div className="d-tb-head"><Avatar n={dir.avatar} size={96} /><div><b>{dir.apodo}{isMe && <em>Tú</em>}{dir.privada && <DuoIcon name="candado" size={20} />}</b><span>{p ? `${p.rango} · nivel ${p.nivel}` : `Nivel ${dir.nivel}`}</span>{p && <small>{p.xp.toLocaleString('es-MX')} XP</small>}</div></div>
  const relRow = !isMe && me && onToggle && <div className={`d-rel ${rel}`}>{REL_TEXT[rel] && <span>{REL_TEXT[rel]}</span>}<FollowButton rel={rel} privada={dir.privada} onToggle={onToggle} /></div>
  if (!p) return <div className="d-tb-profile">
    {head}
    {relRow}
    <div className="d-am-locked"><DuoIcon name="candado" size={44} /><b>Cuenta privada</b><span>{rel === 'pendiente' ? 'Cuando te acepte vas a ver sus números.' : 'Mándale solicitud para ver sus números y competir.'}</span></div>
    <button type="button" className="d-btn white wide" onClick={onBack}>{back}</button>
  </div>
  const week = p.semanaDe === mondayOf(dateKey())
  const stats: [string, string][] = [['XP semana', (week ? p.xpSemana : 0).toLocaleString('es-MX')], ['Racha', `${p.racha} días`], ['Mejor racha', `${p.mejorRacha} días`], ['Jefes', String(p.jefes)], ['Monstruos', `${p.monstruos} de 10`], ['Cartas', String(p.cartas)], ['Reps semana', (week ? p.repsSemana : 0).toLocaleString('es-MX')], ['Km semana', fmt(week ? p.kmSemana : 0, 'km')]]
  const recs = RECORD_EXERCISES.filter(e => (p.records[e.name] ?? 0) > 0 || (!isMe && (me?.records[e.name] ?? 0) > 0))
  return <div className="d-tb-profile">
    {head}
    {relRow}
    <div className="d-tb-stats">{stats.map(([k, v]) => <span key={k}><b>{v}</b><small>{k}</small></span>)}</div>
    <h3>Récords</h3>
    {recs.length ? <div className="d-tb-recs">{recs.map(e => {
      const unit = e.kind === 'seconds' ? 's' : 'reps'
      const his = p.records[e.name] ?? 0
      const mine = me?.records[e.name] ?? 0
      return <div key={e.name} className="d-tb-rec"><span>{e.name}</span><b>{his ? fmt(his, unit) : '—'}</b>{!isMe && me && <small className={mine > his ? 'up' : mine < his ? 'down' : ''}>Tú: {mine ? fmt(mine, unit) : '—'}</small>}</div>
    })}</div> : <p className="d-hint left">Todavía no tiene récords de los ejercicios de las tablas.</p>}
    <button type="button" className="d-btn white wide" onClick={onBack}>{back}</button>
  </div>
}

export function RankList({ rows, uid, unit, onOpen }: { rows: { perfil: Perfil; value: number; place: number }[]; uid?: string; unit: string; onOpen: (p: Perfil) => void }) {
  return <ol className="d-tb-list">{rows.map(r => <li key={r.perfil.uid}>
    <button type="button" className={`d-tb-row ${r.perfil.uid === uid ? 'me' : ''} p${Math.min(r.place, 4)}`} onClick={() => onOpen(r.perfil)}>
      <span className="d-tb-place">{r.place}</span>
      <Avatar n={r.perfil.avatar} size={44} />
      <span className="d-tb-name"><b>{r.perfil.apodo}</b><small>{r.perfil.rango} · nivel {r.perfil.nivel}</small></span>
      <span className="d-tb-val">{fmt(r.value, unit)}</span>
    </button>
  </li>)}</ol>
}

export function BoardPicker({ all, group, board, onGroup, onBoard }: { all: Board[]; group: (typeof GROUPS)[number]; board: Board; onGroup: (g: (typeof GROUPS)[number]) => void; onBoard: (id: string) => void }) {
  return <>
    <div className="d-mode three" role="tablist">{GROUPS.map(g => <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => { onGroup(g); onBoard(all.find(b => b.group === g)!.id) }}>{g}</button>)}</div>
    <div className="d-chips scroll">{all.filter(b => b.group === group).map(b => <button key={b.id} type="button" className={board.id === b.id ? 'on' : ''} onClick={() => onBoard(b.id)}>{b.label}</button>)}</div>
  </>
}

export function TablasSheet({ data, commit, onClose, onMessage }: { data: AppData; commit: Commit; onClose: () => void; onMessage?: (t: string) => void }) {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const today = dateKey()
  const all = useMemo(() => boards(today), [today])
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('General')
  const [boardId, setBoardId] = useState('xp')
  const [scope, setScope] = useState<'todos' | 'amigos'>('todos')
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const joined = !!data.settings.tablas
  const amigos = data.settings.amigos ?? []
  const { social, failed, reload } = useSocial(uid, amigos, !!uid && joined)
  const me = useMemo(() => uid ? buildPerfil(data, uid, today) : null, [data, uid, today])

  const people = useMemo(() => {
    if (!social) return null
    const others = social.perfiles.filter(p => p.uid !== uid && (scope === 'todos' ? p.publica : amigos.includes(p.uid)))
    return me ? [...others, me] : others
  }, [social, me, uid, scope, amigos])
  const board: Board = all.find(b => b.id === boardId) ?? all[0]
  const rows = people ? ranking(people, board) : []
  const myRow = rows.find(r => r.perfil.uid === uid)

  async function leave() {
    if (!uid || !window.confirm('Dejas de salir en las tablas y se borra tu perfil público. Tus datos siguen en tu cuenta.')) return
    try { await borrarPerfil(uid) } catch { window.alert('No se pudo. Revisa tu señal.'); return }
    try { localStorage.removeItem(LAST_KEY(uid)) } catch { return }
    commit(d => ({ ...d, settings: { ...d.settings, tablas: undefined } }))
    setEdit(false)
  }

  if (!uid) return <Sheet title="Tablas" onClose={onClose}>
    <p className="d-hint left">Para competir con otras personas necesitas una cuenta. Ahorita estás sin cuenta y todo vive solo en este teléfono.</p>
    <button type="button" className="d-btn green wide" onClick={() => { setLocalOnly(false); window.location.reload() }}>Crear cuenta o entrar</button>
  </Sheet>

  if (!joined || edit || data.settings.tablas?.privada === undefined) return <Sheet title={joined && data.settings.tablas?.privada !== undefined ? 'Mi perfil' : 'Entra a las tablas'} onClose={onClose}>
    <Join data={data} commit={d => { commit(d); setEdit(false) }} uid={uid} />
    {joined && <button type="button" className="d-btn red wide" onClick={() => void leave()}>Salir de las tablas</button>}
  </Sheet>

  const openDir = open ? (open === uid && me ? { uid, apodo: me.apodo, avatar: me.avatar, nivel: me.nivel, privada: !me.publica, siguiendo: me.siguiendo } : social?.dir.find(d => d.uid === open)) : undefined
  if (openDir) {
    const p = openDir.uid === uid ? me : social?.perfiles.find(x => x.uid === openDir.uid) ?? null
    const rel = relDe(uid, amigos, openDir, social, data.settings.tablas?.privada ? data.settings.aprobados ?? [] : null)
    return <Sheet title={openDir.uid === uid ? 'Mi perfil' : 'Perfil'} tall onClose={onClose}>
      <PerfilView p={p} dir={openDir} me={me} rel={rel} onBack={() => setOpen(null)} onToggle={() => { alternar(commit, uid, amigos, openDir, social).then(t => { onMessage?.(t); reload() }).catch(() => onMessage?.('No se pudo. Revisa tu señal.')) }} />
    </Sheet>
  }

  return <Sheet title="Tablas" tall onClose={onClose}>
    <div className="d-mode two" role="tablist">
      <button type="button" role="tab" aria-selected={scope === 'todos'} className={scope === 'todos' ? 'on' : ''} onClick={() => setScope('todos')}>Todos</button>
      <button type="button" role="tab" aria-selected={scope === 'amigos'} className={scope === 'amigos' ? 'on' : ''} onClick={() => setScope('amigos')}>Amigos</button>
    </div>
    <BoardPicker all={all} group={group} board={board} onGroup={setGroup} onBoard={setBoardId} />
    {failed && <div className="d-tb-empty"><p className="d-hint">No se pudieron cargar las tablas. Revisa tu señal.</p><button type="button" className="d-btn white wide" onClick={reload}>Reintentar</button></div>}
    {!failed && !people && <p className="d-hint">Cargando tablas…</p>}
    {people && <>
      <p className="d-tb-sub">{board.group === 'Récords' ? 'Mejor serie de cada quien' : board.group === 'Semana' ? 'De lunes a hoy' : 'De todos los tiempos'} · {people.length} {people.length === 1 ? 'persona' : 'personas'}{scope === 'todos' ? ' con cuenta pública' : ''}</p>
      {rows.length ? <RankList rows={rows} uid={uid} unit={board.unit} onOpen={p => setOpen(p.uid)} /> : <p className="d-hint">{scope === 'amigos' && people.length < 2 ? 'Agrega amigos desde la sección Amigos para ver su liga aquí.' : 'Nadie tiene esta todavía. Sé el primero.'}</p>}
      {rows.length > 0 && !myRow && <p className="d-hint">Tú todavía no apareces en esta tabla.</p>}
    </>}
    <div className="d-row2">
      <button type="button" className="d-btn white wide small" onClick={() => setOpen(uid)}>Ver mi perfil</button>
      <button type="button" className="d-btn white wide small" onClick={() => setEdit(true)}>Editar</button>
    </div>
  </Sheet>
}
