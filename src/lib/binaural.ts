/** PCM estéreo de dos segundos: frecuencias enteras cierran en fase cero. */
export function binauralWav(beat: number): ArrayBuffer {
  if (![6, 10, 14].includes(beat)) throw new Error('Frecuencia no admitida')
  const rate = 44100, frames = rate * 2
  const buffer = new ArrayBuffer(44 + frames * 4)
  const v = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) v.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true)
  text(36, 'data'); v.setUint32(40, frames * 4, true)
  for (let i = 0; i < frames; i++) {
    v.setInt16(44 + i * 4, Math.round(9800 * Math.sin(2 * Math.PI * 220 * i / rate)), true)
    v.setInt16(46 + i * 4, Math.round(9800 * Math.sin(2 * Math.PI * (220 + beat) * i / rate)), true)
  }
  return buffer
}
