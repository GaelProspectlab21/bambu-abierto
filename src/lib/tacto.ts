import { playSound, soundsOn } from './sounds'

/**
 * v12: el tacto. Un toque de madera al 12 % SOLO en controles de navegación (pestañas, interruptores,
 * chips, la barra de abajo). Las acciones y los premios tienen su propio sonido; si todo sonara igual,
 * el premio dejaría de significar algo. Se apaga aparte de los demás sonidos.
 */
export const TACTO_KEY = 'bambu.tacto'
export const TACTO_SELECTOR = '[role="tab"], [role="radio"], .d-seg button, .d-chips button, .d-mode button, .bottom-nav button, .side-item, input[type="checkbox"], .d-toggle, .dia-tira button'
export function tactoOn(): boolean { try { return localStorage.getItem(TACTO_KEY) !== '0' } catch { return true } }
export function setTacto(on: boolean) { try { localStorage.setItem(TACTO_KEY, on ? '1' : '0') } catch { /* sin preferencia */ } }

export function iniciarTacto() {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', e => {
    const el = (e.target as Element | null)?.closest?.(TACTO_SELECTOR) as HTMLButtonElement | HTMLInputElement | null
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || !tactoOn() || !soundsOn()) return
    playSound('tacto')
  }, { capture: true, passive: true })
}
