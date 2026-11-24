import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { plural } from './lib/text'
import { Card, fmtDay } from './ui'

type Account = { id: string; email: string | null; name: string | null; createdAt: string; lastSignIn: string | null; records: number; owner: boolean }

/** Solo aparece a la cuenta dueña: ver las cuentas de amigos y borrar las que ya no van. */
export function AdminAccounts({ onMessage }: { onMessage: (t: string) => void }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data } = await supabase.functions.invoke('bambu-account', { body: { action: 'admin-list' } })
    const list = (data as { ok?: boolean; accounts?: Account[] } | null)
    setAccounts(list?.ok && list.accounts ? list.accounts : null)
  }
  useEffect(() => { void load() }, [])

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

  if (!accounts) return null // 403 para quien no es dueño: la tarjeta no existe
  return <Card className="admin-accounts">
    <h2>Cuentas</h2>
    <p className="hint">Solo tú ves esto. Las cuentas dueñas no se pueden borrar.</p>
    <ul className="admin-list">{accounts.map(a => <li key={a.id}>
      <div><strong>{a.name ?? 'Sin nombre'}{a.owner ? ' · dueña' : ''}</strong>
        <small>{a.email} · desde {fmtDay(a.createdAt.slice(0, 10))} · {plural(a.records, 'registro', 'registros')}</small></div>
      {!a.owner && (confirm?.id === a.id
        ? <div className="admin-confirm"><input className="text-input" placeholder="Escribe BORRAR" value={confirm.text} autoComplete="off" onChange={e => setConfirm({ id: a.id, text: e.target.value })} />
            <button type="button" className="secondary-button" disabled={busy || confirm.text !== 'BORRAR'} onClick={() => void remove(a)}>Borrar para siempre</button>
            <button type="button" className="quiet-button" onClick={() => setConfirm(null)}>Cancelar</button></div>
        : <button type="button" className="quiet-button" onClick={() => setConfirm({ id: a.id, text: '' })}>Borrar</button>)}
    </li>)}</ul>
  </Card>
}
