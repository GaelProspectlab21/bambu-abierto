export type SoundKind = 'tap' | 'complete' | 'streak' | 'level' | 'error'
export const SOUND_KEY = 'bambu.sonidos'
export const SOUND_NOTES: Record<SoundKind, readonly number[]> = {
  tap: [440], complete: [440, 660], streak: [440, 550, 660], level: [330, 440, 660], error: [330, 294],
}
export function soundAllowed(preference: string | null, hidden: boolean, interrupted: boolean, mediaPlaying: boolean): boolean {
  return preference === '1' && !hidden && !interrupted && !mediaPlaying
}
export function soundsOn(): boolean { try { return localStorage.getItem(SOUND_KEY) === '1' } catch { return false } }
export function setSounds(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0') } catch { /* preference unavailable */ }
  if (!on && context) { void context.close().catch(() => undefined); context = undefined }
}
let context: AudioContext | undefined
let lastAt = -Infinity
export function playSound(kind: SoundKind) {
  try {
    const session = (navigator as Navigator & { audioSession?: { state: string } }).audioSession
    const media = [...document.querySelectorAll<HTMLMediaElement>('audio,video')].some(el => !el.paused && !el.muted)
    if (!soundAllowed(localStorage.getItem(SOUND_KEY), document.hidden, session?.state === 'interrupted', media)) return
    const now = performance.now()
    if (now - lastAt < (kind === 'tap' ? 240 : 100)) return
    lastAt = now
    // Web Audio defaults to ambient. Do not override the focus audio session.
    context ??= new AudioContext()
    const ctx = context
    const emit = () => {
      if (ctx.state !== 'running' || !soundsOn() || document.hidden || performance.now() - now > 200) return
      SOUND_NOTES[kind].forEach((hz, i) => {
        const start = ctx.currentTime + i * 0.065
        const gain = ctx.createGain(), osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(hz * 1.35, start)
        osc.frequency.exponentialRampToValueAtTime(hz, start + 0.018)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.025 : 0.045, start + 0.003)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(start); osc.stop(start + 0.15)
        osc.onended = () => { osc.disconnect(); gain.disconnect() }
      })
    }
    if (ctx.state === 'suspended') void ctx.resume().then(emit).catch(() => undefined)
    else emit()
  } catch { /* Recording always works without audio. */ }
}
