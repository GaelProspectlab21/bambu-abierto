import { useSyncExternalStore } from 'react'
import { audioEngine } from './lib/audioEngine'
import { AUDIO_PRESETS, type AudioBackground } from './lib/binaural'

export function BinauralAudio({ beat }: { enabled?: boolean; beat?: number }) {
  const state = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  return <section className="binaural-panel" aria-label="Audio binaural">
    <strong>Tu sonido</strong><p>Usa audífonos a volumen bajo. El sonido sigue al cambiar de página o pausar tu sesión.</p>
    <div className="audio-controls">
      <label>Sonido<select value={state.beat} onChange={e => audioEngine.configure({ beat: Number(e.target.value) })}>{AUDIO_PRESETS.map(p => <option key={p.beat} value={p.beat}>{p.name} · {p.beat} Hz</option>)}</select></label>
      <label>Fondo<select value={state.background} onChange={e => audioEngine.configure({ background: e.target.value as AudioBackground })}><option value="none">Solo tonos</option><option value="brown">Ruido marrón suave</option></select></label>
      <label>Volumen<input type="range" min="0" max="60" value={state.volume} onChange={e => audioEngine.setVolume(Number(e.target.value))} /></label>
      <label>Apagar después<select value={state.timerMinutes} onChange={e => audioEngine.setTimer(Number(e.target.value))}>{[0, 15, 30, 60].map(m => <option key={m} value={m}>{m ? `${m} min` : 'Sin temporizador'}</option>)}</select></label>
      <button type="button" className="secondary-button" aria-pressed={state.playing} onClick={() => state.playing ? audioEngine.pause() : void audioEngine.play(!state.started && beat ? { beat } : undefined)}>{state.playing ? 'Pausar audio' : 'Reproducir audio'}</button>
    </div>
    <p className="hint">La evidencia de los binaurales es mixta. Un sonido constante puede ayudar a tapar el ruido. En iPhone ajusta también el volumen con los botones.</p>
    {state.error && <p role="status">{state.error}</p>}
  </section>
}

export function AudioMiniPlayer() {
  const state = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  if (!state.started) return null
  return <aside className="audio-mini" aria-label="Reproductor de sonido">
    <span><strong>{AUDIO_PRESETS.find(p => p.beat === state.beat)?.name} · {state.beat} Hz</strong><small>{state.playing ? 'Sonando' : state.interrupted ? 'Interrumpido' : 'En pausa'}{state.timerMinutes ? ` · ${state.timerMinutes} min` : ''}</small></span>
    <button type="button" onClick={() => state.playing ? audioEngine.pause() : void audioEngine.play()} aria-label={state.playing ? 'Pausar audio' : 'Reanudar audio'}>{state.playing ? 'Ⅱ' : '▶'}</button>
    <button type="button" onClick={() => audioEngine.stop()} aria-label="Cerrar audio">×</button>
  </aside>
}
