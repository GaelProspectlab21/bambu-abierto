import type { StretchMove } from './lib/stretch'

export function StretchPhoto({ move, compact = false }: { move: StretchMove; compact?: boolean }) {
  const frames = move.frame === undefined ? [0, 1] : [move.frame]
  return <figure className={`stretch-photo${compact ? ' compact' : ''}`}>
    <div>{frames.map(frame => <img key={frame} src={`/estiramientos/${move.photo}-${frame}.jpg`} alt={`${move.name}, referencia ${frame + 1}`} width="220" height="140" />)}</div>
    <figcaption>Foto real de <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">Free Exercise DB</a>, Unlicense. {move.kind === 'dynamic' ? 'Muévete despacio entre posiciones.' : 'Sostén sin forzar.'}</figcaption>
  </figure>
}
