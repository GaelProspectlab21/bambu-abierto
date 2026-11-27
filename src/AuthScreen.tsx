import { useState, type FormEvent } from 'react'
import { cuenta, errorDeCuenta, setLocalOnly } from './lib/nube'
import { oauthReturnError } from './lib/supabase'
import { GOOGLE_INVITE_MESSAGE } from './lib/oauth'
import { GoogleAccount } from './GoogleAccount'
import { LegalLinks } from './Legal'
import { DuoIcon } from './DuoIcons'
import { Cielo } from './Onboarding'

type View = 'entrar' | 'crear' | 'recuperar'
type Props = { recovery?: boolean; onRecoveryComplete?: () => void }

function iosInBrowser(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

/** Entrada v9: el diseño de Kiki con las reglas de la nube de Gael (invitación, 12 caracteres, Google oficial). */
export function AuthScreen({ recovery = false, onRecoveryComplete }: Props) {
  const [view, setView] = useState<View>('entrar')
  const [name, setName] = useState('')
  const [invite, setInvite] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(oauthReturnError ? GOOGLE_INVITE_MESSAGE : '')

  function go(next: View) { setView(next); setNotice(''); setError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const mail = email.trim().toLowerCase()
    setBusy(true); setNotice(''); setError('')
    try {
      if (recovery) {
        await cuenta.nuevaContrasena(password)
        setPassword('')
        onRecoveryComplete?.()
      } else if (view === 'crear') {
        await cuenta.crear(mail, password, name, invite)
      } else if (view === 'recuperar') {
        await cuenta.recuperar(mail)
        setNotice('Listo. Si ese correo tiene cuenta, te llega un enlace para cambiar la contraseña. Revisa también spam.')
      } else {
        await cuenta.entrar(mail, password)
      }
    } catch (reason) {
      setError(errorDeCuenta(reason))
    } finally { setBusy(false) }
  }

  const title = recovery ? 'Crea una contraseña nueva' : view === 'crear' ? 'Crea tu cuenta' : view === 'recuperar' ? 'Recupera tu acceso' : 'Entra a tu cuenta'
  const copy = recovery ? 'Usa 12 caracteres o más.' : view === 'crear' ? 'Necesitas el código que te pasó quien te invitó. Si ya usabas Bambú en este teléfono, se sube todo lo que tienes.' : view === 'recuperar' ? 'Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.' : 'Con Google o con tu correo.'
  return <main className="d-auth ob-fondo">
    <Cielo />
    <section className="d-auth-card">
      <div className="d-auth-brand"><img src="icon.svg" width="44" height="44" alt="" /><img className="d-auth-nombre" src="logo-nombre.png" width="104" height="30" alt="bambú" /></div>
      <h1>{title}</h1>
      <p className="d-auth-copy">{copy}</p>
      {!recovery && view === 'entrar' && <>
        <div className="d-google-slot"><GoogleAccount onError={setError} /></div>
        <div className="d-auth-or"><span>o con tu correo</span></div>
      </>}
      {!recovery && view !== 'recuperar' && <div className="d-mode two" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'entrar'} className={view === 'entrar' ? 'on' : ''} onClick={() => go('entrar')}>Entrar</button>
        <button type="button" role="tab" aria-selected={view === 'crear'} className={view === 'crear' ? 'on' : ''} onClick={() => go('crear')}>Tengo invitación</button>
      </div>}
      <form className="d-auth-form" onSubmit={submit}>
        {!recovery && view === 'crear' && <>
          <label className="d-field">Tu nombre o apodo<input className="d-input" autoComplete="nickname" required maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Cómo te dicen" /></label>
          <label className="d-field">Código de invitación<input className="d-input" autoComplete="off" autoCapitalize="characters" required maxLength={16} value={invite} onChange={e => setInvite(e.target.value)} placeholder="8 letras y números" /></label>
        </>}
        {!recovery && <label className="d-field">Correo<input className="d-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" /></label>}
        {(recovery || view !== 'recuperar') && <label className="d-field">{recovery ? 'Contraseña nueva' : 'Contraseña'}
          <span className="d-pass">
            <input className="d-input" type={show ? 'text' : 'password'} autoComplete={recovery || view === 'crear' ? 'new-password' : 'current-password'} required minLength={recovery || view === 'crear' ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={recovery || view === 'crear' ? 'Mínimo 12 caracteres' : 'Tu contraseña'} />
            <button type="button" className="d-pass-eye" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}>{show ? 'Ocultar' : 'Ver'}</button>
          </span>
        </label>}
        {error && <p className="d-auth-msg error" role="alert">{error}</p>}
        {notice && <p className="d-auth-msg ok" role="status">{notice}</p>}
        <button className="d-btn green wide" type="submit" disabled={busy}>{busy ? 'Un momento' : recovery ? 'Guardar contraseña' : view === 'crear' ? 'Crear mi cuenta' : view === 'recuperar' ? 'Mandar enlace' : 'Entrar'}</button>
        {view === 'crear' && <LegalLinks />}
      </form>
      {!recovery && (view === 'recuperar'
        ? <button type="button" className="d-auth-link" onClick={() => go('entrar')}>Volver a entrar</button>
        : view === 'entrar' && <button type="button" className="d-auth-link" onClick={() => go('recuperar')}>Olvidé mi contraseña</button>)}
      {!recovery && iosInBrowser() && <p className="d-auth-ios"><DuoIcon name="estrella" size={20} />Para que no te pida entrar a cada rato, abre Bambú desde el ícono de tu pantalla de inicio, con Abrir como app web activado.</p>}
      {!recovery && <button type="button" className="d-btn white wide" onClick={() => { setLocalOnly(true); window.location.reload() }}>Seguir sin cuenta</button>}
      {!recovery && <p className="d-auth-foot">Sin cuenta todo se queda solo en este teléfono.</p>}
    </section>
  </main>
}
