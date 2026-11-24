import { useEffect, useState } from 'react'
import { cleanReminders, type AppData, type Reminders } from './lib/model'
import { bedtime, hhmm, minutesOf } from './lib/reminders'
import { disablePush, enablePush, pushState, testPush, type PushState } from './lib/push'
import { supabase } from './lib/supabase'
import { Card } from './ui'

type Commit = (update: (d: AppData) => AppData) => void

const STATE_TEXT: Partial<Record<PushState, string>> = {
  install: 'En iPhone los avisos solo llegan con Bambú instalada: Safari, Compartir, Añadir a pantalla de inicio. Ábrela desde el ícono y regresa aquí.',
  unsupported: 'Este navegador no recibe avisos. Actívalos desde el iPhone con Bambú instalada.',
  denied: 'Bloqueaste los avisos. Ve a Ajustes del iPhone, Notificaciones, Bambú, y permítelos.',
}
const FIELDS: { key: 'checkin' | 'train' | 'read'; label: string; hint: string }[] = [
  { key: 'checkin', label: 'Check-in de la mañana', hint: 'Si ya lo hiciste, no suena.' },
  { key: 'train', label: 'Entrenar', hint: 'Solo los días que el coach pone torso o pierna. Fútbol, descanso o dolor: no suena.' },
  { key: 'read', label: 'Leer', hint: 'Si ya leíste hoy, no suena.' },
]

export function RemindersCard({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: (t: string) => void }) {
  const r = cleanReminders(data.settings.reminders)
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')) }, [])
  const set = (patch: Partial<Reminders>) => commit(d => ({ ...d, settings: { ...d.settings, reminders: { ...cleanReminders(d.settings.reminders), ...patch } } }))
  const bed = bedtime(r, data.settings.sleepTarget)

  async function run(action: () => Promise<void>) {
    if (!supabase || busy) return
    setBusy(true)
    try { await action() } catch (error) { console.error(error); onMessage(error instanceof Error ? error.message : 'Algo falló con los avisos.') }
    finally { setBusy(false); setState(await pushState().catch(() => 'unsupported' as const)) }
  }
  const activate = () => run(async () => {
    const next = await enablePush(supabase!)
    if (next === 'on') { set({ on: true }); onMessage('Listo: este teléfono ya recibe tus avisos.') }
    else if (STATE_TEXT[next]) onMessage(STATE_TEXT[next]!)
  })
  const test = () => run(async () => {
    const sent = await testPush(supabase!)
    onMessage(sent ? `Aviso de prueba enviado a ${sent === 1 ? 'tu teléfono' : `${sent} dispositivos`}.` : 'No hay teléfonos registrados. Activa los avisos primero.')
  })
  const off = () => run(async () => { await disablePush(supabase!); onMessage('Este teléfono ya no recibe avisos.') })

  return <Card>
    <span className="eyebrow">RECORDATORIOS</span>
    <h2>Te aviso solo si falta</h2>
    <p>A la hora que elijas, Bambú revisa tus registros. Si ya lo hiciste, no suena.</p>
    {state && STATE_TEXT[state] && <p className="caution">{STATE_TEXT[state]}</p>}
    {state === 'off' && <div className="row-actions"><button className="primary-button" disabled={busy} onClick={activate}>Activar avisos en este teléfono</button></div>}
    {state === 'on' && <>
      <label className="checkbox-label"><input type="checkbox" checked={r.on} onChange={() => set({ on: !r.on })} />Avisos encendidos en todos mis teléfonos</label>
      <div className="row-actions"><button className="secondary-button" disabled={busy} onClick={test}>Probar aviso</button><button className="quiet-button" disabled={busy} onClick={off}>Apagar en este teléfono</button></div>
    </>}
    <div className="reminder-grid">
      {FIELDS.map(f => <label key={f.key} className="field-label">{f.label} <span>{r[f.key] ? '' : '· apagado'}</span>
        <input className="text-input" type="time" value={r[f.key]} onChange={e => set({ [f.key]: e.target.value })} aria-label={`Hora de ${f.label}`} />
        <small className="hint">{f.hint}</small></label>)}
      <label className="field-label">Me levanto a las
        <input className="text-input" type="time" value={r.wake} onChange={e => e.target.value && set({ wake: e.target.value })} aria-label="Hora de levantarte" />
        <small className="hint">A la cama a las {bed} ({data.settings.sleepTarget} h). Te aviso a las {hhmm(minutesOf(bed) - 30)}.</small></label>
    </div>
    <label className="checkbox-label"><input type="checkbox" checked={r.photos} onChange={() => set({ photos: !r.photos })} />Foto de progreso una vez al mes, al levantarme</label>
    <p className="hint">Para apagar uno, borra su hora.</p>
  </Card>
}
