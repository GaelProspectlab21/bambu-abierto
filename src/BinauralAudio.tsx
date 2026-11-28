import { useSyncExternalStore } from 'react'
import { audioEngine } from './lib/audioEngine'
import { AUDIO_PRESETS, type AudioBackground } from './lib/binaural'

/** Para qué sirve cada sonido, en palabras de uso (antes eran dos listas distintas y dos no sonaban). */
const USO: Record<number, string> = { 10: 'Lectura y flujo', 6: 'Bajar revoluciones', 14: 'Código, tareas y análisis' }

/**
 * Sonido para concentrarte (v11.4): un solo panel. Tocas un modo y suena; un botón grande pausa;
 * fondo, volumen y temporizador con controles de la app, no los del navegador.
 */
export function BinauralAudio({ beat }: { enabled?: boolean; beat?: number }) {
  const state = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot)
  const elegir = (b: number) => { if (state.playing && state.beat === b) return; void audioEngine.play({ beat: b }) }
  const toggle = () => state.playing ? audioEngine.pause() : void audioEngine.play(!state.started && beat && AUDIO_PRESETS.some(p => p.beat === beat) ? { beat } : undefined)
  const actual = AUDIO_PRESETS.find(p => p.beat === state.beat)
  return <section className="snd" aria-label="Sonido para concentrarte">
    <div className="snd-modos" role="radiogroup" aria-label="Modo de sonido">{AUDIO_PRESETS.map(p => <button key={p.beat} type="button" role="radio" aria-checked={state.beat === p.beat} className={`snd-modo ${state.beat === p.beat ? 'on' : ''} ${state.beat === p.beat && state.playing ? 'sonando' : ''}`} onClick={() => elegir(p.beat)}>
      <b>{p.name}</b><small>{USO[p.beat]}</small><i aria-hidden="true">{p.beat} Hz</i>
    </button>)}</div>
    <button type="button" className={`snd-play ${state.playing ? 'on' : ''}`} aria-pressed={state.playing} onClick={toggle}>
      <span className="snd-icono" aria-hidden="true">{state.playing ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg> : <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5Z" /></svg>}</span>
      <span><b>{state.playing ? `Sonando: ${actual?.name ?? ''}` : state.started ? 'En pausa' : 'Tocar para empezar'}</b><small>{state.timerMinutes ? `Se apaga en ${state.timerMinutes} min` : 'Usa audífonos a volumen bajo'}</small></span>
    </button>
    <div className="snd-fila">
      <span className="snd-et">Fondo</span>
      <div className="snd-seg">{([['none', 'Solo tonos'], ['brown', 'Ruido marrón']] as [AudioBackground, string][]).map(([k, l]) => <button key={k} type="button" aria-pressed={state.background === k} className={state.background === k ? 'on' : ''} onClick={() => audioEngine.configure({ background: k })}>{l}</button>)}</div>
    </div>
    <label className="snd-fila"><span className="snd-et">Volumen</span><input className="snd-vol" type="range" min="0" max="60" value={state.volume} style={{ ['--v' as string]: `${state.volume / 60 * 100}%` }} onChange={e => audioEngine.setVolume(Number(e.target.value))} /></label>
    <div className="snd-fila">
      <span className="snd-et">Apagar</span>
      <div className="snd-seg">{[0, 15, 30, 60].map(m => <button key={m} type="button" aria-pressed={state.timerMinutes === m} className={state.timerMinutes === m ? 'on' : ''} onClick={() => audioEngine.setTimer(m)}>{m ? `${m} min` : 'Nunca'}</button>)}</div>
    </div>
    <p className="snd-nota">Sigue sonando si cambias de página. La evidencia de los binaurales es mixta; lo que sí ayuda es un sonido constante que tape el ruido.</p>
    {state.error && <p role="status" className="snd-error">{state.error}</p>}
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
