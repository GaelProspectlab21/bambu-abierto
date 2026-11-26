/** Tema de la app: automático (como el teléfono), claro u oscuro. Se guarda por dispositivo. */
export type ThemeChoice = 'auto' | 'claro' | 'oscuro'
const KEY = 'bambu.theme'

export function themeChoice(): ThemeChoice {
  return 'oscuro'
}
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): 'light' | 'dark' {
  return choice === 'oscuro' ? 'dark' : choice === 'claro' ? 'light' : systemDark ? 'dark' : 'light'
}
export function applyTheme(choice: ThemeChoice = themeChoice()): void {
  const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  const theme = resolveTheme(choice, dark)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0d1013' : '#0d1013')
}
export function setThemeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(KEY, choice) } catch { /* se aplica igual en esta sesión */ }
  applyTheme(choice)
}
export function watchSystemTheme(): void {
  if (typeof matchMedia !== 'function') return
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themeChoice() === 'auto') applyTheme('auto') })
}
