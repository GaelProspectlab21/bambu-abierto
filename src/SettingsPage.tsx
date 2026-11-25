import { plural } from './lib/text'
import { useEffect, useState } from 'react'
import { accountCapabilities, cloudAvailable, localOnly, setLocalOnly, supabase } from './lib/supabase'
import { activeHabits, modulesOf, type AppData, type Modules } from './lib/model'
import { NFC_TAGS, nfcUrl, type NfcAction } from './lib/nfc'
import { PauseSetup } from './PauseSetup'
import { AdminAccounts } from './AdminAccounts'
import { clearAccountStorage } from './lib/storage'
import { clearOwnPhotos } from './lib/photos'
import type { SyncStatus } from './lib/sync'
import { HabitEditor } from './HabitsPage'
import { RemindersCard } from './RemindersCard'
import { Card, Chips, Heading, Stepper, rewardSound, setSounds, soundsOn } from './ui'
import { setThemeChoice, themeChoice, type ThemeChoice } from './lib/theme'
import { listPhotos } from './lib/photos'
import { companionOn, setCompanionOn } from './Companion'
import { GoogleAccount } from './GoogleAccount'

type Commit = (update: (d: AppData) => AppData) => void
type Props = {
  data: AppData; commit: Commit; onMessage: (t: string) => void; status: SyncStatus | null; cloud: boolean
  onExport: () => void; onImport: (file?: File) => void; onResync: () => void; onSignOut: () => void; onDeleteAccount: () => Promise<void>
}

export function SettingsPage({ data, commit, onMessage, status, cloud, onExport, onImport, onResync, onSignOut, onDeleteAccount }: Props) {
  const [canInvite, setCanInvite] = useState(false)
  const [invite, setInvite] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  useEffect(() => { let active = true; void accountCapabilities().then(c => { if (active) setCanInvite(c.invitations) }); return () => { active = false } }, [])
  async function createInvite() {
    if (!supabase || accountBusy) return
    setAccountBusy(true)
    try { const { data: code, error } = await supabase.rpc('bambu_create_invite'); if (error || typeof code !== 'string') throw error; setInvite(code) }
    catch { onMessage('No pudimos generar el código. Revisa tu conexión.') }
    finally { setAccountBusy(false) }
  }
  async function downloadData() {
    if (accountBusy) return
    setAccountBusy(true)
    try {
      let accountExport: unknown = null
      if (cloud && supabase) { const result = await supabase.functions.invoke('bambu-account', { body: { action: 'export' } }); if (result.error) throw result.error; accountExport = result.data }
      const photos = await listPhotos()
      const localPhotos = await Promise.all(photos.map(async ({ blob, ...photo }) => ({ ...photo, image: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) }) })))
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([JSON.stringify({ ...data, accountExport, localPhotos }, null, 2)], { type: 'application/json' }))
      link.download = 'bambu-mis-datos.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      onMessage('Tus datos se descargaron. Las fotos salieron de este teléfono, sin subir a la nube.')
    } catch { onMessage('No pudimos completar la descarga. Revisa tu conexión y vuelve a intentar.') }
    finally { setAccountBusy(false) }
  }
  async function deleteAccount() {
    if (deleteText !== 'BORRAR' || accountBusy || !window.confirm('Esto borra tu cuenta y todos sus registros en la nube. También borra los datos y las fotos de esta cuenta en este teléfono. No se puede deshacer. ¿Borrar mi cuenta?')) return
    setAccountBusy(true)
    try { await onDeleteAccount() }
    catch { onMessage('No pudimos completar el borrado. Vuelve a intentar antes de cerrar esta página.') }
    finally { setAccountBusy(false) }
  }
  const [sound, setSound] = useState(soundsOn)
  const secure = window.location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
  const [theme, setTheme] = useState<ThemeChoice>(themeChoice())
  const [mascot, setMascot] = useState(companionOn())
  const [habitTag, setHabitTag] = useState(activeHabits(data.settings)[0]?.id ?? '')
  // Llave de las etiquetas: con ella funcionan aunque Safari no tenga sesión (ver nfcActions.ts).
  const [key, setKey] = useState('')
  useEffect(() => {
    if (!supabase || !cloud) return
    supabase.rpc('bambu_nfc_key', { p_rotate: false }).then(({ data: k, error }) => { if (!error && typeof k === 'string') setKey(k) })
  }, [cloud])
  async function rotate() {
    if (!supabase || !window.confirm('Las etiquetas que ya grabaste dejarán de funcionar y tendrás que grabarlas otra vez. ¿Cambiar la llave?')) return
    const { data: k, error } = await supabase.rpc('bambu_nfc_key', { p_rotate: true })
    if (error || typeof k !== 'string') { onMessage('No se pudo cambiar la llave.'); return }
    setKey(k); onMessage('Llave nueva. Graba otra vez tus etiquetas.')
  }
  const s = data.settings
  const set = (patch: Partial<AppData['settings']>) => commit(d => ({ ...d, settings: { ...d.settings, ...patch } }))
  function copy(action: NfcAction) {
    const url = nfcUrl(window.location.origin, action, key)
    if (!navigator.clipboard) { onMessage(url); return }
    navigator.clipboard.writeText(url).then(() => onMessage('Enlace copiado. Grábalo en la etiqueta con NFC Tools como registro URL.')).catch(() => onMessage(url))
  }
  return <>
    <Heading eyebrow="AJUSTES" title="Tu espacio" text="Etiquetas, metas, hábitos y respaldo." />
    {cloud && <Card><h2>Tu cuenta</h2><GoogleAccount link onError={onMessage} /><button type="button" className="quiet-button" onClick={onSignOut}>Cerrar sesión</button></Card>}
    <Card><h2>Apariencia</h2><p className="hint">Automático sigue el modo de tu teléfono.</p><Chips label="Mascota" value={mascot ? 'on' : 'off'} onChange={v => { setCompanionOn(v === 'on'); setMascot(v === 'on') }} options={[['on', 'Mascota visible'], ['off', 'Ocultar mascota']]} /><Chips label="Tema" value={theme} onChange={t => { setThemeChoice(t); setTheme(t) }} options={[['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']]} /><Chips label="Sonidos" value={sound ? 'on' : 'off'} onChange={v => { setSounds(v === 'on'); setSound(v === 'on'); if (v === 'on') rewardSound() }} options={[['on', 'Sonidos suaves'], ['off', 'Sin sonidos']]} /></Card>
    <Card><h2>Tu norte</h2><p className="hint">En quién te quieres convertir. La reflexión de la noche te lo pregunta.</p>
      <input className="text-input" value={data.profile.north ?? ''} maxLength={140} placeholder="Con tus palabras" aria-label="Tu norte" onChange={e => commit(d => ({ ...d, profile: { ...d.profile, north: e.target.value || undefined } }))} /></Card>
    <Card><h2>Qué mides</h2><p className="hint">Lo que apagas no aparece ni cuenta en tus misiones. No borra nada de lo que ya registraste.</p>
      <Chips multiple label="Módulos" value={(Object.keys(modulesOf(data.settings)) as (keyof Modules)[]).filter(k => modulesOf(data.settings)[k])} onChange={k => commit(d => { const m = modulesOf(d.settings); const next = { ...m, [k]: !m[k] }; if (k === 'reading' && m.reading) next.bible = false; if (k === 'bible' && !m.bible) next.reading = true; return { ...d, settings: { ...d.settings, modules: next } } })}
        options={[['reading', 'Lectura'], ['bible', 'Biblia'], ['training', 'Entreno'], ['focus', 'Enfoque y tareas'], ['food', 'Comida']] as [keyof Modules, string][]} /></Card>
    <Card tone="accent"><span className="eyebrow">COMPARTIR</span><h2>Pásale Bambú a alguien</h2>
      <p className="hint">Cada persona lo arma a su medida: su norte, sus módulos y sus hábitos. Sin cuenta, todo se queda en su teléfono y tú no ves nada de lo suyo.</p>
      <button className="secondary-button" onClick={() => { const url = window.location.origin; const text = 'Te comparto Bambú: una app para medir cuánto das cada día, no cuánto produces. Ábrela y elige «Usar sin cuenta».'; if (navigator.share) void navigator.share({ title: 'Bambú', text, url }).catch(() => undefined); else navigator.clipboard?.writeText(`${text} ${url}`).then(() => onMessage('Enlace copiado.')).catch(() => onMessage(url)) }}>Compartir el enlace</button></Card>
    {canInvite && <Card><h2>Invitar a un amigo</h2><p>Comparte un código con una sola persona. Sirve una vez.</p><button className="secondary-button" disabled={accountBusy} onClick={() => void createInvite()}>Generar código</button>{invite && <label className="field-label">Tu código<input className="text-input" readOnly value={invite} onFocus={e => e.target.select()} /></label>}</Card>}
    {cloudAvailable && localOnly() && <Card><h2>Modo sin cuenta</h2><p className="hint">Tus datos están solo en este dispositivo. Antes de entrar con una cuenta, descarga tu respaldo abajo.</p>
      <button className="secondary-button" onClick={() => { setLocalOnly(false); window.location.reload() }}>Entrar con una cuenta</button></Card>}
    {cloud && <RemindersCard data={data} commit={commit} onMessage={onMessage} />}
    {cloud ? <Card tone="accent">
      <span className="eyebrow">ETIQUETAS NFC</span>
      <h2>Una etiqueta por lugar de tu casa</h2>
      <p>Cada etiqueta guarda solo un enlace. Al acercar el iPhone toca la notificación y Bambú hace lo que toca: si no hay sesión la empieza, si hay una la cierra.</p>
      <p className="hint">El iPhone abre las etiquetas en Safari, no en la app. Por eso cada enlace lleva tu llave: registra la acción sin pedirte que entres, y la app la ve al sincronizar. Si ya habías grabado etiquetas sin llave, grábalas otra vez con estos enlaces.</p>
      {cloud && !key && <p className="caution">Cargando tu llave de etiquetas. Sin ella, los enlaces piden iniciar sesión en Safari.</p>}
      {!secure && <p className="caution">Los enlaces funcionan desde la app publicada en HTTPS. Aquí puedes verlos, pero grábalos desde el teléfono.</p>}
      <div className="nfc-list">{NFC_TAGS.map(t => <article key={t.tag}><div><strong>{t.title}</strong><p>{t.does}</p><small>Dónde: {t.where}</small><code>{nfcUrl(window.location.origin, { tag: t.tag }, key)}</code></div>
        <div className="row-actions"><button className="secondary-button" onClick={() => copy({ tag: t.tag })}>Copiar enlace</button><a className="quiet-button" href={`/?nfc=${t.tag}`}>Probar</a></div></article>)}
        <article><div><strong>Hábito con etiqueta</strong><p>Marca un hábito de hoy con un toque. Ej. una en la cama para "tender la cama" o en el tapete de estiramiento.</p>
          <select className="text-input" value={habitTag} onChange={e => setHabitTag(e.target.value)} aria-label="Hábito de la etiqueta">{activeHabits(s).map(h => <option key={h.id} value={h.id}>{h.label}</option>)}</select>
          {habitTag && <code>{nfcUrl(window.location.origin, { tag: 'habit', habit: habitTag }, key)}</code>}</div>
          <div className="row-actions"><button className="secondary-button" disabled={!habitTag} onClick={() => copy({ tag: 'habit', habit: habitTag })}>Copiar enlace</button></div></article>
      </div>
      {key && <p className="hint">Quien lea una de tus etiquetas puede marcar estas acciones en tu cuenta, nada más. Si pierdes una: <button className="quiet-button inline" onClick={() => void rotate()}>Cambiar la llave</button></p>}
      <details><summary>Cómo grabar una etiqueta</summary><ol className="steps"><li>Instala NFC Tools en el iPhone.</li><li>Escribir, Agregar un registro, URL, y pega el enlace.</li><li>Escribir y acerca la etiqueta a la parte de arriba del iPhone.</li><li>Prueba una etiqueta antes de grabar las demás.</li><li>La etiqueta abre Safari y muestra "Hecho". Ciérralo y abre Bambú desde el ícono: ya lo tiene.</li></ol></details>
    </Card> : <Card><h2>Sincronización, etiquetas y avisos</h2><p>Necesitas una cuenta para sincronizar, usar etiquetas NFC y recibir recordatorios.</p></Card>}
    {cloud && <AdminAccounts onMessage={onMessage} />}
    {cloud && <PauseSetup keyValue={key} onCopy={url => { if (!navigator.clipboard) { onMessage(url); return } navigator.clipboard.writeText(url).then(() => onMessage('Enlace copiado. Pégalo en la acción Abrir URL de tu atajo Bambú Pausa.')).catch(() => onMessage(url)) }} />}
    {modulesOf(data.settings).training && <Card><h2>Entrenamiento</h2>
      <label className="field-label">¿Qué días juegas fútbol?</label>
      <Chips multiple label="Días de fútbol" value={s.footballDays} onChange={d => set({ footballDays: s.footballDays.includes(d) ? s.footballDays.filter(x => x !== d) : [...s.footballDays, d].sort() })} options={[[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']]} />
      <label className="field-label">Descanso entre series</label>
      <Chips label="Descanso" value={s.restSeconds} onChange={v => set({ restSeconds: v })} options={[[60, '60 s'], [90, '90 s'], [120, '2 min'], [180, '3 min']]} />
      <label className="field-label">Horas de sueño meta</label><Stepper label="horas de sueño" unit="h" value={s.sleepTarget} onChange={v => set({ sleepTarget: v })} min={7} max={11} step={0.5} />
      <label className="field-label">Pasos meta</label><Stepper label="pasos" value={s.stepsTarget} onChange={v => set({ stepsTarget: v })} min={2000} max={20000} step={1000} />
    </Card>}
    {modulesOf(data.settings).focus && <Card><h2>Enfoque</h2>
      <label className="field-label">Meta semanal de horas</label><Stepper label="horas por semana" unit="h" value={Math.round(s.weeklyFocusGoal / 60 * 2) / 2} onChange={v => set({ weeklyFocusGoal: Math.round(v * 60) })} min={0} max={60} step={0.5} /><p className="hint">En cero, no comparas tu ritmo con una meta.</p>
      {[4, 3, 2, 1].map(n => <label key={n} className="field-label">Nivel {n}<input className="text-input" value={s.leverageLabels[String(n)]} maxLength={160} onChange={e => set({ leverageLabels: { ...s.leverageLabels, [String(n)]: e.target.value } })} /></label>)}
      <label className="field-label">Ritual antes del bloque</label>
      {s.distractions.map(item => <label key={item.id} className="checkbox-label"><input type="checkbox" checked={item.enabled} onChange={() => set({ distractions: s.distractions.map(x => x.id === item.id ? { ...x, enabled: !x.enabled } : x) })} />{item.label}</label>)}
    </Card>}
    <HabitEditor data={data} commit={commit} />
    <Card><h2>Guardado y respaldo</h2>
      <p className="hint">Si borras los datos de Safari o desinstalas la app, puedes perder lo que no se haya sincronizado. Descarga un respaldo antes. Las fotos viven solo en este teléfono.</p>
      <p role="status">{!cloud ? 'Modo local: los datos viven en este navegador.' : !status ? 'Abriendo tu espacio.' : status.phase === 'synced' ? `Todo sincronizado${status.lastSyncAt ? ` a las ${new Date(status.lastSyncAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }).replace(/\.$/, '')}` : ''}.` : status.phase === 'offline' ? `Sin conexión. ${status.pending} cambios esperan en este teléfono y se suben solos.` : `Sincronizando ${status.pending} cambios.`}</p>
      <div className="row-actions"><button className="primary-button" onClick={onExport}>Descargar respaldo</button>
        <label className="secondary-button file-action">Restaurar respaldo<input type="file" accept="application/json,.json" onChange={e => { onImport(e.target.files?.[0]); e.target.value = '' }} /></label>
        {cloud && <button className="secondary-button" onClick={onResync}>Volver a bajar todo</button>}</div>
      <p className="hint">{plural(data.reading.length, 'lectura', 'lecturas')} · {plural(data.bible.length, 'capítulo', 'capítulos')} · {plural(data.focus.length, 'bloque', 'bloques')} · {plural(data.sets.length, 'serie', 'series')} · {plural(data.tasks.length, 'tarea', 'tareas')}</p>
    </Card>
    <Card><h2>Tus datos</h2><p>Descarga tus registros y las fotos de este teléfono. Con cuenta, también incluye los datos guardados en la nube.</p><button className="secondary-button" disabled={accountBusy} onClick={() => void downloadData()}>Descargar mis datos</button>
      {!cloud && localOnly() && <details><summary>Borrar este perfil</summary><p>Este perfil vive solo en este navegador. Se borran sus datos y sus fotos de aquí. Tu cuenta en la nube, si tienes, no se toca.</p><label className="field-label">Escribe BORRAR<input className="text-input" value={deleteText} autoComplete="off" onChange={e => setDeleteText(e.target.value)} /></label><button className="secondary-button" disabled={deleteText !== 'BORRAR'} onClick={() => { if (!window.confirm('Se borra este perfil sin cuenta y todo lo que guardó en este navegador. ¿Seguro?')) return; void Promise.allSettled([clearOwnPhotos(), clearAccountStorage('local')]).then(() => { setLocalOnly(false); window.location.reload() }) }}>Borrar este perfil</button></details>}
      {cloud && <details><summary>Borrar mi cuenta</summary><p>Se borran tu cuenta y sus registros en la nube. En este teléfono también se borran tus fotos. Borra los datos de bambú en tus otros dispositivos para quitar sus copias locales.</p><label className="field-label">Escribe BORRAR<input className="text-input" value={deleteText} autoComplete="off" onChange={e => setDeleteText(e.target.value)} /></label><button className="secondary-button" disabled={accountBusy || deleteText !== 'BORRAR'} onClick={() => void deleteAccount()}>Borrar mi cuenta para siempre</button></details>}
    </Card>
    <Card><h2>En tu inicio</h2><p>iPhone: abre bambú en Safari, Compartir, Añadir a pantalla de inicio. Abre siempre desde ese ícono.</p><p>Android: abre bambú en Chrome, menú de tres puntos, Instalar app o Agregar a pantalla principal.</p>{cloud && <button className="quiet-button" onClick={onSignOut}>Cerrar sesión</button>}</Card>
  </>
}
