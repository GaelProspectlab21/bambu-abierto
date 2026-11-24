import { useEffect, useRef, useState } from 'react'
import { binauralWav } from './lib/binaural'

export function BinauralAudio({ enabled, beat: fixedBeat }: { enabled: boolean; beat?: number }) {
  const engine = useRef<{ ctx: AudioContext; gain: GainNode; source: AudioBufferSourceNode } | null>(null)
  const generation = useRef(0)
  const volumeRef = useRef(30)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false) // ya sonó alguna vez: los controles de la pantalla bloqueada se quedan al pausar
  const [choice, setChoice] = useState(10)
  const [volume, setVolume] = useState(30)
  const [error, setError] = useState('')
  const beat = fixedBeat ?? choice
  volumeRef.current = volume
  function stop() {
    generation.current++
    const current = engine.current
    engine.current = null
    setPlaying(false)
    if (current) {
      if (current.ctx.state !== 'running') { void current.ctx.close(); return }
      current.gain.gain.cancelScheduledValues(current.ctx.currentTime)
      current.gain.gain.setTargetAtTime(0, current.ctx.currentTime, .025)
      current.source.stop(current.ctx.currentTime + .15)
      current.source.onended = () => { void current.ctx.close() }
    }
  }
  useEffect(() => { if (!enabled) stop() }, [enabled])
  useEffect(() => { stop(); setStarted(false); return stop }, [beat])
  useEffect(() => {
    const e = engine.current
    if (e) e.gain.gain.setTargetAtTime(volume / 100, e.ctx.currentTime, .03)
  }, [volume])
  useEffect(() => {
    if (!started || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Bambú, audio para leer', artist: `${beat} Hz` })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('pause', () => void stop())
    navigator.mediaSession.setActionHandler('play', () => { if (enabled) void play() })
  }, [started, playing, beat, enabled])
  useEffect(() => () => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('pause', null)
    navigator.mediaSession.setActionHandler('play', null)
    navigator.mediaSession.playbackState = 'none'
    navigator.mediaSession.metadata = null
  }, [])
  async function play() {
    if (!enabled) return
    if (engine.current) { await engine.current.ctx.resume(); return }
    const token = ++generation.current
    setError('')
    const ctx = new AudioContext()
    try {
      const resumed = ctx.resume()
      const buffer = await ctx.decodeAudioData(binauralWav(beat))
      await resumed
      if (token !== generation.current) { await ctx.close(); return }
      const source = ctx.createBufferSource(), gain = ctx.createGain()
      source.buffer = buffer
      source.loop = true
      gain.gain.value = 0
      source.connect(gain).connect(ctx.destination)
      engine.current = { ctx, source, gain }
      ctx.onstatechange = () => {
        if (engine.current?.ctx === ctx) setPlaying(ctx.state === 'running')
      }
      source.start()
      gain.gain.linearRampToValueAtTime(volumeRef.current / 100, ctx.currentTime + .4)
      setStarted(true)
      setPlaying(true)
    } catch {
      await ctx.close()
      if (token === generation.current) setError('No se pudo reproducir. Toca el botón para intentarlo otra vez.')
    }
  }
  function toggle() {
    if (engine.current && playing) stop()
    else void play()
  }
  return <section className="binaural-panel" aria-label="Audio binaural">
    <strong>Tu sonido para leer</strong><p>Dos tonos, uno por oído. Usa audífonos a volumen bajo.</p>
    <div className="audio-controls">
      {!fixedBeat && <label>Diferencia entre tonos<select value={choice} disabled={playing} onChange={e => setChoice(Number(e.target.value))}>{[6, 10, 14].map(n => <option key={n} value={n}>{n} Hz</option>)}</select></label>}
      <label>Volumen<input type="range" min="0" max="100" value={volume} onChange={e => { const v = Number(e.target.value); setVolume(v);  }} /></label>
      <button type="button" className="secondary-button" disabled={!enabled} aria-pressed={playing} onClick={toggle}>{playing ? 'Pausar audio' : 'Reproducir audio'}</button>
    </div><p className="hint">Se genera en tu teléfono y funciona sin conexión. Si el teléfono interrumpe el audio al bloquearse, vuelve y toca reproducir.</p>
    {error && <p role="alert">{error}</p>}
  </section>
}
