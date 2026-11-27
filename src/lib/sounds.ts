/**
 * La voz de Bambú: todo sale de madera de bambú, campanas de viento y un cuenco. Se sintetiza
 * en Web Audio (cero archivos, funciona sin red, el bundle no crece y nadie nos cobra licencia).
 * Regla: suena solo lo que GANASTE. Nunca al azar, nunca al navegar.
 * Escala pentatónica de Re: cualquier combinación de notas suena bien, así que la racha de
 * marcas sube nota por nota sin desafinar.
 */
export type SoundKind = 'complete' | 'undo' | 'achieve' | 'record' | 'streak' | 'level' | 'day' | 'gold' | 'focusStart' | 'focusEnd'
export const SOUND_KEY = 'bambu.sonidos'

/** Re pentatónica, de Re4 a Re6. */
export const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.26, 739.99, 880, 987.77, 1174.66] as const
type Voice = 'wood' | 'bell' | 'bowl'
type Note = readonly [voice: Voice, degree: number, at: number, vol?: number]

/** La partitura de cada momento: [voz, grado de la escala, segundos desde el inicio, volumen]. */
export const SCORES: Record<Exclude<SoundKind, 'complete'>, readonly Note[]> = {
  undo: [['wood', 1, 0, .5], ['wood', 0, .07, .4]],
  achieve: [['wood', 5, 0], ['bell', 8, .09, .55]],
  record: [['wood', 6, 0], ['wood', 8, .08], ['bell', 9, .17, .6]],
  streak: [['wood', 5, 0], ['wood', 7, .07], ['wood', 8, .14], ['wood', 10, .21], ['bell', 10, .3, .6]],
  level: [['wood', 0, 0], ['wood', 3, .08], ['wood', 5, .16], ['wood', 7, .24], ['wood', 8, .32], ['bell', 10, .42, .55], ['bell', 8, .42, .35], ['bowl', 0, .42, .5]],
  day: [['wood', 3, 0], ['wood', 4, .11], ['wood', 5, .22], ['bell', 8, .5, .6], ['bowl', 5, .5, .5]],
  gold: [['bell', 7, 0, .35], ['bell', 8, .05, .35], ['bell', 9, .1, .35], ['bell', 10, .15, .45], ['wood', 10, .15, .5]],
  focusStart: [['bowl', 0, 0, .8]],
  focusEnd: [['bowl', 3, 0, 1], ['bell', 5, .9, 1], ['bell', 8, 1.8, 1]],
}
/** Más alto gana: una celebración nunca la tapa el clic que la provocó. */
const PRIORITY: Record<SoundKind, number> = { undo: 0, complete: 1, achieve: 2, record: 2, focusStart: 2, gold: 3, streak: 3, level: 4, day: 4, focusEnd: 4 }

/** Encendido salvo que lo apagues. El iPhone respeta el modo silencio porque Web Audio es ambiente. */
export function soundAllowed(preference: string | null, hidden: boolean, interrupted: boolean, mediaPlaying: boolean): boolean {
  return preference !== '0' && !hidden && !interrupted && !mediaPlaying
}

/** El impulso: cada marca seguida (menos de 12 s) sube un grado. Tope en Re6, y empieza en La4. */
export const COMBO_WINDOW = 12_000
export function comboStep(prev: number, prevAt: number, now: number): number {
  return now - prevAt < COMBO_WINDOW ? Math.min(prev + 1, SCALE.length - 4) : 0
}
export function completeScore(step: number): readonly Note[] {
  const degree = 3 + step
  return step >= 4 ? [['wood', degree, 0], ['bell', Math.min(degree + 2, SCALE.length - 1), .04, .3]] : [['wood', degree, 0]]
}

export function soundsOn(): boolean { try { return localStorage.getItem(SOUND_KEY) !== '0' } catch { return true } }
export function setSounds(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0') } catch { /* preference unavailable */ }
  if (!on && context) { void context.close().catch(() => undefined); context = undefined; bus = undefined }
}

let context: AudioContext | undefined
let bus: { dry: AudioNode; wet: AudioNode } | undefined
let last = { at: -Infinity, priority: -1 }
let combo = { step: -1, at: -Infinity }

/** Un cuarto pequeño: compresor para que nada truene y una cola de reverb corta para que respire. */
function chain(ctx: AudioContext) {
  if (bus) return bus
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14; comp.ratio.value = 4
  const master = ctx.createGain(); master.gain.value = 1
  master.connect(comp); comp.connect(ctx.destination)
  const len = Math.floor(ctx.sampleRate * 1.1), ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) }
  const verb = ctx.createConvolver(); verb.buffer = ir
  const send = ctx.createGain(); send.gain.value = .16
  send.connect(verb); verb.connect(master)
  bus = { dry: master, wet: send }
  return bus
}

function partial(ctx: AudioContext, out: AudioNode[], hz: number, t: number, peak: number, decay: number, attack = .002) {
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.frequency.setValueAtTime(hz * 1.015, t); osc.frequency.exponentialRampToValueAtTime(hz, t + .012)
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + decay)
  osc.connect(g); out.forEach(n => g.connect(n))
  osc.start(t); osc.stop(t + decay + .02)
  osc.onended = () => { osc.disconnect(); g.disconnect() }
}

/** El golpe de madera: el ataque es ruido filtrado (la baqueta), el cuerpo son modos de un tubo de bambú. */
function knock(ctx: AudioContext, out: AudioNode[], hz: number, t: number, vol: number) {
  const n = Math.floor(ctx.sampleRate * .012), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = Math.min(hz * 4, 9000); bp.Q.value = 1.6; g.gain.value = .6 * vol
  src.connect(bp); bp.connect(g); out.forEach(o => g.connect(o)); src.start(t)
  src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect() }
}

function voice(ctx: AudioContext, [kind, degree, at, vol = 1]: Note, t0: number) {
  const { dry, wet } = chain(ctx), hz = SCALE[Math.max(0, Math.min(SCALE.length - 1, degree))], t = t0 + at
  if (kind === 'wood') {
    knock(ctx, [dry, wet], hz, t, vol)
    partial(ctx, [dry, wet], hz, t, .5 * vol, .32)
    partial(ctx, [dry], hz * 3.01, t, .12 * vol, .1)
    partial(ctx, [dry], hz * 5.1, t, .05 * vol, .05)
  } else if (kind === 'bell') {
    ;[[1, 1, 1.4], [2.76, .4, .8], [5.4, .2, .45], [8.93, .08, .25]].forEach(([r, a, d]) => partial(ctx, [dry, wet], hz * r, t, .26 * a * vol, d, .003))
  } else {
    // El cuenco: dos tonos casi iguales que laten despacio. Entra suave y se queda.
    ;[[1, 1], [1.004, .8], [2.71, .25]].forEach(([r, a]) => partial(ctx, [dry, wet], hz * r, t, .3 * a * vol, 3.2, .04))
  }
}

/** force: la campana del bloque suena aunque el sonido de premios esté apagado (es una alarma). */
export function playSound(kind: SoundKind, force = false) {
  try {
    const session = (navigator as Navigator & { audioSession?: { state: string } }).audioSession
    const media = [...document.querySelectorAll<HTMLMediaElement>('audio,video')].some(el => !el.paused && !el.muted)
    const pref = force ? '1' : localStorage.getItem(SOUND_KEY)
    if (!soundAllowed(pref, document.hidden, session?.state === 'interrupted', force ? false : media)) return
    const now = performance.now(), priority = PRIORITY[kind]
    if (now - last.at < 90 && priority <= last.priority) return
    last = { at: now, priority }
    let score: readonly Note[]
    if (kind === 'complete') {
      const step = comboStep(combo.step, combo.at, Date.now())
      combo = { step, at: Date.now() }
      score = completeScore(step)
    } else score = SCORES[kind]
    // Web Audio queda en sesión ambiente: no tapa el audio binaural ni la música de nadie.
    context ??= new AudioContext()
    const ctx = context
    const emit = () => {
      if (ctx.state !== 'running' || (!force && !soundsOn()) || document.hidden || performance.now() - now > 250) return
      const t0 = ctx.currentTime + .005
      score.forEach(note => voice(ctx, note, t0))
    }
    if (ctx.state === 'suspended') void ctx.resume().then(emit).catch(() => undefined)
    else emit()
  } catch { /* Registrar siempre funciona sin audio. */ }
}
