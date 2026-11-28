import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { plural } from './lib/text'
import { fmtDay } from './ui'
import { DuoIcon } from './DuoIcons'
import { mensajeInvitacion } from './lib/invitar'

type Account = { id: string; email: string | null; name: string | null; createdAt: string; lastSignIn: string | null; records: number; owner: boolean }

/**
 * Solo la cuenta dueña la ve (el servidor responde 403 a las demás y la tarjeta no existe).
 * v11.5: estaba escondida desde la fusión con la carcasa de Kiki y no había forma de crear un código
 * de invitación desde la app. Ahora invita amigos y, como antes, borra las cuentas que ya no van.
 */
export function AdminAccounts({ onMessage }: { onMessage: (t: string) => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')

  async function load() {
    if (!supabase) return
    const { data } = await supabase.functions.invoke('bambu-account', { body: { action: 'admin-list' } })
    const list = (data as { ok?: boolean; accounts?: Account[] } | null)
    setAccounts(list?.ok && list.accounts ? list.accounts : null)
  }
  useEffect(() => { void load() }, [])

  async function invitar() {
    if (!supabase || busy) return
    setBusy(true)
    const { data, error } = await supabase.rpc('bambu_create_invite')
    setBusy(false)
    if (error || typeof data !== 'string') { onMessage(error?.message?.includes('25') ? 'Ya tienes 25 invitaciones sin usar.' : 'No se pudo crear la invitación. Revisa tu señal.'); return }
    setCode(data)
    copiar(data)
  }
  function copiar(c: string) {
    const texto = mensajeInvitacion(c, document.baseURI)
    navigator.clipboard?.writeText(texto).then(() => onMessage('Invitación copiada. Pégala en WhatsApp.')).catch(() => onMessage(`Código: ${c}`))
  }

  async function remove(a: Account) {
    if (!supabase || busy || confirm?.text !== 'BORRAR') return
    if (!window.confirm(`Se borra la cuenta de ${a.name ?? a.email} con todos sus registros. No se puede deshacer. ¿Seguro?`)) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('bambu-account', { body: { action: 'admin-delete', target: a.id, confirmation: 'BORRAR' } })
    setBusy(false)
    if (error || !(data as { ok?: boolean } | null)?.ok) { onMessage('No se pudo borrar. Intenta de nuevo.'); return }
    onMessage(`Cuenta de ${a.name ?? a.email} borrada.`)
    setConfirm(null)
    void load()
  }

  if (!accounts) return null
  const amigos = accounts.filter(a => !a.owner)
  return <div className="d-card admin-accounts">
    <div className="d-card-head"><h2>Invita a un amigo</h2><DuoIcon name="amigos" size={36} /></div>
    <p className="d-hint left">Cada código sirve una vez y dura 30 días. Se copia un mensaje con el enlace listo para mandar.</p>
    {code && <button type="button" className="admin-code" onClick={() => copiar(code)} aria-label={`Código ${code}. Toca para copiar otra vez.`}>{code}</button>}
    <button type="button" className="d-btn green wide" disabled={busy} onClick={() => void invitar()}>{busy ? 'Creando…' : code ? 'Crear otro código' : 'Crear invitación'}</button>
    {amigos.length > 0 && <>
      <p className="d-tb-sub">{plural(amigos.length, 'cuenta de amigo', 'cuentas de amigos')}</p>
      <ul className="admin-list">{amigos.map(a => <li key={a.id}>
        <div><strong>{a.name ?? 'Sin nombre'}</strong>
          <small>{a.email} · desde {fmtDay(a.createdAt.slice(0, 10))} · {plural(a.records, 'registro', 'registros')}</small></div>
        {confirm?.id === a.id
          ? <div className="admin-confirm"><input className="d-input" placeholder="Escribe BORRAR" value={confirm.text} autoComplete="off" onChange={e => setConfirm({ id: a.id, text: e.target.value })} />
              <button type="button" className="d-btn red" disabled={busy || confirm.text !== 'BORRAR'} onClick={() => void remove(a)}>Borrar para siempre</button>
              <button type="button" className="d-link" onClick={() => setConfirm(null)}>Cancelar</button></div>
          : <button type="button" className="d-link" onClick={() => setConfirm({ id: a.id, text: '' })}>Borrar</button>}
      </li>)}</ul>
    </>}
  </div>
}
