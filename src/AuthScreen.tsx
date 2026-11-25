import { useState } from 'react'
import type { FormEvent } from 'react'
import { oauthReturnError, setLocalOnly, supabase } from './lib/supabase'
import { GOOGLE_INVITE_MESSAGE } from './lib/oauth'
import { GoogleAccount } from './GoogleAccount'

type Props = { recovery: boolean; onRecoveryComplete: () => void }
type View = 'sign-in' | 'sign-up' | 'reset'

function authClient() {
  if (!supabase) throw new Error('La conexión de cuenta no está configurada.')
  return supabase
}

/** iPhone abriendo Bambú en Safari y no como app instalada: ahí la sesión puede no guardarse. */
function iosInBrowser(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

function friendlyError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (message.includes('Email not confirmed')) return 'Confirma tu correo desde el mensaje que te enviamos.'
  if (message.includes('rate limit')) return 'Hubo varios intentos seguidos. Espera un momento y vuelve a probar.'
  return 'No pudimos completar la solicitud. Revisa tus datos y vuelve a intentar.'
}

export function AuthScreen({ recovery, onRecoveryComplete }: Props) {
  const [view, setView] = useState<View>('sign-in')
  const [name, setName] = useState('')
  const [invitation, setInvitation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(oauthReturnError ? GOOGLE_INVITE_MESSAGE : '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    setError('')
    try {
      if (recovery) {
        if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.')
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
        const { error: updateError } = await authClient().auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword('')
        setConfirmation('')
        onRecoveryComplete()
        setNotice('Contraseña actualizada. Tu cuenta quedó protegida con la nueva clave.')
      } else if (view === 'sign-up') {
        if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.')
        const { data, error: signupError } = await authClient().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { display_name: name.trim(), invitation_code: invitation.trim() } } })
        if (signupError) { setError('No pudimos crear tu cuenta. Revisa el código de invitación, el correo y la contraseña.'); return }
        if (!data.session) setNotice('Revisa tu correo para terminar el registro.')
      } else if (view === 'reset') {
        const { error: resetError } = await authClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin })
        if (resetError) throw resetError
        setNotice('Si ese correo tiene una cuenta, recibirá un enlace para cambiar la contraseña.')
      } else {
        const { error: signInError } = await authClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (signInError) throw signInError
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : ''
      setError(message.startsWith('Usa una contraseña') || message.startsWith('Las contraseñas') ? message : friendlyError(message))
    } finally {
      setBusy(false)
    }
  }

  const heading = recovery ? 'Crea una contraseña nueva.' : view === 'reset' ? 'Recupera tu acceso.' : view === 'sign-up' ? 'Crea tu espacio.' : 'Entra a tu espacio.'
  return <main className="welcome-screen auth-screen"><section className="welcome-card auth-card">
    <div className="welcome-brand"><img src="/icon.svg" width="32" height="32" alt="" /> bambú</div>
    <div className="eyebrow">CUENTA PERSONAL</div>
    <h1>{heading}</h1>
    <p className="welcome-copy">{recovery ? 'Elige una contraseña de 12 caracteres o más.' : view === 'sign-up' ? 'Con tu código de invitación, en menos de un minuto.' : view === 'reset' ? 'Te mandamos un enlace a tu correo.' : 'Entra con Google o con tu correo.'}</p>
    {!recovery && iosInBrowser() && <div className="ios-install" role="note">
      <strong>Estás en Safari, no en la app.</strong>
      <p>Si Safari está en modo privado, cada vez que abres te pide entrar. Para que Bambú recuerde tu sesión:</p>
      <ol><li>Sal del modo privado en Safari.</li><li>Abre esta página y toca Compartir.</li><li>Añadir a pantalla de inicio, con <b>Abrir como app web</b> activado.</li><li>Borra el ícono viejo y abre siempre desde el nuevo.</li></ol>
    </div>}
    {!recovery && view === 'sign-in' && <><GoogleAccount onError={setError} /><div className="auth-or" aria-hidden="true"><span>o con tu correo</span></div></>}
    <form onSubmit={handleSubmit}>
      {!recovery && view === 'sign-up' && <><label className="field-label">Nombre o apodo<input className="text-input" autoComplete="nickname" required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label><label className="field-label">Código de invitación<input className="text-input" autoComplete="off" required maxLength={100} value={invitation} onChange={e => setInvitation(e.target.value)} /></label></>}
      {!recovery && <label className="field-label">Correo electrónico<input className="text-input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu correo" /></label>}
      {view !== 'reset' || recovery ? <label className="field-label">{recovery ? 'Nueva contraseña' : 'Contraseña'}<input className="text-input" type="password" autoComplete={recovery || view === 'sign-up' ? 'new-password' : 'current-password'} required minLength={recovery || view === 'sign-up' ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
      {recovery && <label className="field-label">Repite la contraseña<input className="text-input" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>}
      {error && <p className="auth-message error" role="alert">{error}</p>}
      {notice && <p className="auth-message success" role="status">{notice}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Un momento' : recovery ? 'Actualizar contraseña' : view === 'reset' ? 'Enviar enlace' : view === 'sign-up' ? 'Crear mi cuenta' : 'Iniciar sesión'}<span>↗</span></button>
    </form>
    {!recovery && <div className="auth-links"><button className="auth-switch" onClick={() => { setView(view === 'sign-up' ? 'sign-in' : 'sign-up'); setNotice(''); setError('') }}>{view === 'sign-up' ? 'Ya tengo cuenta' : 'Tengo una invitación'}</button>
    <button className="auth-switch" onClick={() => { setView(view === 'reset' ? 'sign-in' : 'reset'); setNotice(''); setError('') }}>{view === 'reset' ? 'Volver a iniciar sesión' : 'Olvidé mi contraseña'}</button></div>}
    {!recovery && <button className="quiet-button local-mode-button" onClick={() => { setLocalOnly(true); window.location.reload() }}>Usar sin cuenta, solo en este dispositivo</button>}
    <div className="privacy-note"><span className="local-dot" />Cada cuenta tiene su propio espacio privado.</div>
  </section><p className="welcome-foot">bambú · tus datos siguen siendo tuyos</p></main>
}
