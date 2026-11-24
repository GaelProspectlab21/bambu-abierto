/**
 * Toque físico al marcar algo. Android vibra con la API estándar. iOS no la tiene: Safari 18
 * da un toque corto cuando cambia un interruptor nativo (input switch), así que se dispara uno
 * escondido. Solo funciona dentro de un gesto del usuario (un toque) y no se puede probar sin iPhone.
 */
let label: HTMLLabelElement | null = null

function iosSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null
  if (label?.isConnected) return label
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
  label.append(input)
  document.body.append(label)
  return label
}

export function haptic(ms: number | number[] = 12): void {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (navigator.vibrate) { navigator.vibrate(ms); return }
    iosSwitch()?.click()
  } catch { /* sin háptica no se pierde nada */ }
}
