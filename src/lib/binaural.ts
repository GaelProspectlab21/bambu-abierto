export const AUDIO_PRESETS = [{ name: 'Leer', beat: 10 }, { name: 'Calma', beat: 6 }, { name: 'Enfoque', beat: 14 }] as const
export type AudioBackground = 'none' | 'brown'
export const LOOP_SECONDS = 30
/** Tonos de ciclos enteros; el ruido se desvanece en la costura, sin salto de amplitud. */
export function binauralWav(beat: number, background: AudioBackground = 'none', gain = 1): ArrayBuffer {
  if (!AUDIO_PRESETS.some(p => p.beat === beat)) throw new Error('Frecuencia no admitida')
  const rate = 44100, frames = rate * LOOP_SECONDS
  const buffer = new ArrayBuffer(44 + frames * 4), v = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) v.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true)
  text(36, 'data'); v.setUint32(40, frames * 4, true)
  // Ruido continuo en la costura: los primeros XF cuadros se funden con los que seguirían al final.
  const XF = Math.round(rate * .5), noise = new Float32Array(background === 'brown' ? frames + XF : 0)
  let brown = 0, seed = 1234567
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    brown = (brown + (seed / 4294967296 * 2 - 1) * .02) / 1.02
    noise[i] = brown * 12000
  }
  const g = Math.max(0, Math.min(1, gain))
  for (let i = 0; i < frames; i++) {
    const n = !noise.length ? 0 : i < XF ? noise[i] * Math.sqrt(i / XF) + noise[frames + i] * Math.sqrt(1 - i / XF) : noise[i]
    v.setInt16(44 + i * 4, Math.round(g * (7000 * Math.sin(2 * Math.PI * 200 * i / rate) + n)), true)
    v.setInt16(46 + i * 4, Math.round(g * (7000 * Math.sin(2 * Math.PI * (200 + beat) * i / rate) + n)), true)
  }
  return buffer
}
