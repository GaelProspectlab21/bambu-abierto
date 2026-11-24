import { binauralWav, AUDIO_PRESETS, type AudioBackground } from './binaural'

type State = { beat: number; background: AudioBackground; volume: number; playing: boolean; started: boolean; interrupted: boolean; error: string; timerMinutes: number; deadline: number }
/** One engine per document. Subscribing/unsubscribing never owns playback. */
export function createAudioEngine(createAudio: () => HTMLAudioElement = () => new Audio()) {
  let state: State = { beat: 10, background: 'none', volume: 30, playing: false, started: false, interrupted: false, error: '', timerMinutes: 0, deadline: 0 }
  const listeners = new Set<() => void>()
  let audio: HTMLAudioElement | undefined, url = '', wanted = false, generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined, fade: ReturnType<typeof setInterval> | undefined, rebake: ReturnType<typeof setTimeout> | undefined
  // iPhone ignora audio.volume (siempre 1): ahí el volumen se hornea dentro del WAV.
  let nativeVolume: boolean | undefined
  const canSetVolume = (el: HTMLAudioElement) => { if (nativeVolume === undefined) { const before = el.volume; el.volume = .5; nativeVolume = Math.abs(el.volume - .5) < .01; el.volume = before }; return nativeVolume }
  const session = () => typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
  function publish(patch: Partial<State>) {
    state = { ...state, ...patch }; listeners.forEach(fn => fn())
    const media = session()
    if (media) media.playbackState = state.playing ? 'playing' : state.started ? 'paused' : 'none'
  }
  function ramp(to: number, finish?: () => void) {
    clearInterval(fade)
    if (!audio || !canSetVolume(audio)) { finish?.(); return }
    const element = audio, from = element.volume, start = Date.now()
    fade = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 350)
      element.volume = from + (to - from) * t
      if (t === 1) { clearInterval(fade); finish?.() }
    }, 25)
  }
  function expired() { if (state.deadline && Date.now() >= state.deadline) { stop(); return true }; return false }
  function ensure() {
    if (audio) return audio
    audio = createAudio(); audio.loop = true; audio.setAttribute('playsinline', '')
    audio.addEventListener('pause', () => {
      publish({ playing: false, interrupted: wanted })
      // No retry loop: a call or another app must retain the audio session.
    })
    audio.addEventListener('playing', () => { if (!wanted || expired()) { audio?.pause(); return }; publish({ playing: true, interrupted: false, error: '' }) })
    audio.addEventListener('timeupdate', expired)
    audio.addEventListener('error', () => publish({ playing: false, error: 'No se pudo reproducir. Vuelve a tocar reproducir.' }))
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      if (expired()) return
      const nav = navigator as Navigator & { audioSession?: { state: string } }
      if (document.visibilityState === 'visible' && wanted && state.interrupted && nav.audioSession?.state !== 'interrupted') void play()
    })
    const media = session()
    if (media) for (const [action, handler] of [['play', () => void play()], ['pause', pause], ['stop', stop]] as const) {
      try { media.setActionHandler(action, handler) } catch { /* Optional in older Safari. */ }
    }
    return audio
  }
  function source() {
    const element = ensure()
    if (url) URL.revokeObjectURL(url)
    url = URL.createObjectURL(new Blob([binauralWav(state.beat, state.background, canSetVolume(element) ? 1 : state.volume / 60)], { type: 'audio/wav' }))
    element.src = url
    const media = session()
    if (media && typeof MediaMetadata !== 'undefined') media.metadata = new MediaMetadata({ title: `bambú · ${AUDIO_PRESETS.find(p => p.beat === state.beat)?.name}`, artist: `${state.beat} Hz` })
  }
  async function play(options?: Partial<Pick<State, 'beat' | 'background'>>) {
    if (options) configure(options)
    if (expired()) return
    const token = ++generation
    wanted = true
    const element = ensure()
    if (!url) source()
    clearInterval(fade); if (canSetVolume(element)) element.volume = 0
    publish({ started: true, error: '' })
    try {
      await element.play()
      if (token !== generation || !wanted) return
      publish({ playing: true, interrupted: false }); ramp(state.volume / 100)
      if (state.timerMinutes && !state.deadline) setTimer(state.timerMinutes)
    } catch {
      if (token === generation) publish({ playing: false, interrupted: false, error: 'El teléfono pausó el sonido. Toca reproducir para seguir.' })
    }
  }
  function pause() {
    wanted = false; generation++
    publish({ playing: false, interrupted: false })
    ramp(0, () => audio?.pause())
  }
  function stop() {
    pause(); clearTimeout(timer)
    publish({ started: false, deadline: 0, timerMinutes: 0, error: '' })
    ramp(0, () => { audio?.pause(); if (audio) audio.removeAttribute('src'); if (url) URL.revokeObjectURL(url); url = '' })
    const media = session(); if (media) media.metadata = null
  }
  function configure(patch: Partial<Pick<State, 'beat' | 'background'>>) {
    if (patch.beat !== undefined && !AUDIO_PRESETS.some(p => p.beat === patch.beat)) return
    if (patch.beat === state.beat && (!patch.background || patch.background === state.background)) return
    const resume = wanted
    wanted = false; generation++; clearInterval(fade); audio?.pause()
    publish({ ...patch, playing: false, interrupted: false })
    if (audio) source()
    if (resume) void play()
  }
  function setTimer(minutes: number) {
    clearTimeout(timer)
    const m = [15, 30, 60].includes(minutes) ? minutes : 0
    const deadline = m && state.started ? Date.now() + m * 60000 : 0
    publish({ timerMinutes: m, deadline })
    if (deadline) timer = setTimeout(stop, Math.max(0, deadline - Date.now()))
  }
  return { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }, getSnapshot: () => state, play, pause, stop, configure, setTimer,
    setVolume: (volume: number) => {
      publish({ volume: Math.max(0, Math.min(60, volume)) })
      if (!audio || canSetVolume(audio)) { if (state.playing) ramp(state.volume / 100); return }
      clearTimeout(rebake)
      rebake = setTimeout(() => { if (!audio || !url) return; const at = audio.currentTime, resume = wanted; source(); audio.currentTime = at; if (resume) void audio.play() }, 300)
    } }
}
export const audioEngine = createAudioEngine()
