/**
 * Efectos pegados a la acción (la recompensa inmediata de Hábitos atómicos, cap. 15):
 * una chispa sale del botón que tocaste y un "+1" sube desde ahí. Todo en DOM y CSS,
 * sin librerías. Con movimiento reducido no se dibuja nada.
 */
import { rewardSound } from './ui'

function calm(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

function origin(from?: Element | { x: number; y: number } | null): { x: number; y: number } {
  if (from && 'getBoundingClientRect' in from) {
    const r = from.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  if (from && 'x' in from) return from
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.6 }
}

/** Una ráfaga corta de hojas y chispas en el punto del toque. */
export function burst(from?: Element | { x: number; y: number } | null, count = 14) {
  if (calm() || typeof document === 'undefined') return
  const { x, y } = origin(from)
  const layer = document.createElement('div')
  layer.className = 'juice-burst'
  layer.style.left = `${x}px`
  layer.style.top = `${y}px`
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2
    const dist = 38 + (i % 4) * 14
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
    p.style.setProperty('--dy', `${Math.sin(angle) * dist - 18}px`)
    p.style.setProperty('--rot', `${(i * 47) % 360}deg`)
    p.className = `c${i % 4}`
    layer.appendChild(p)
  }
  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), 900)
}

/** Texto que sube y se desvanece desde el botón: "+1", "+25 XP". */
export function floatText(text: string, from?: Element | { x: number; y: number } | null) {
  if (typeof document === 'undefined') return
  const { x, y } = origin(from)
  const el = document.createElement('div')
  el.className = `juice-float ${calm() ? 'calm' : ''}`
  el.textContent = text
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 1300)
}

/** Las dos juntas, con el sonido corto si lo tienes encendido: lo que pasa cuando registras algo. */
export function reward(from?: Element | { x: number; y: number } | null, text = '+1') {
  burst(from)
  rewardSound()
  floatText(text, from)
}
