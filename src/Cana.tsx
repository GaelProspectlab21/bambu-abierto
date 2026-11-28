/**
 * El sistema de marca de Bambú en una pieza (v12). Ver docs/SISTEMA.md.
 * Todo sale de LA CAÑA: un segmento con corte a machete (15°), hueco, nudo claro, labio oscuro abajo,
 * la banda de brasa (tu compromiso) y el brote con la hoja canónica. Brote es esta caña con cara,
 * brazos y pies. El logo es esta caña sin cara frente al sol. Si cambias una pieza aquí, cambian los dos.
 * Coordenadas en un lienzo de 160 x 160.
 */
export const MARCA = {
  noche: '#0e1411', verde: '#37cb69', labio: '#1e9348', nudo: '#5fe786', hueco: '#0c2e16', hoja: '#7fd38f',
  brasa: '#fa7c20', brasaLabio: '#c25a12', sol: '#f6c443', solLabio: '#c3951c',
} as const

/** La hoja canónica: la misma en el brote, los brazos de Brote y el logo. Se dibuja desde (x, y). */
export const hoja = (x: number, y: number, s = 1) => `M${x} ${y}c${2 * s} ${-10 * s} ${9 * s} ${-15 * s} ${19 * s} ${-15 * s}${-2 * s} ${10 * s} ${-9 * s} ${15 * s} ${-19 * s} ${15 * s}Z`

/** Contorno de calcomanía: solo en las capas de atrás, así se ve por fuera y nunca por dentro. */
const borde = (contorno: boolean) => contorno ? { stroke: MARCA.noche, strokeWidth: 5, strokeLinejoin: 'round' as const } : {}

export function CanaCuerpo({ dormido = false, contorno = true }: { dormido?: boolean; contorno?: boolean }) {
  const C = MARCA, b = borde(contorno)
  return <>
    <path d="M54 50L106 36V126q0 12-12 12H66q-12 0-12-12Z" fill={C.labio} {...b} />
    <path d="M54 50L106 36V118q0 12-12 12H66q-12 0-12-12Z" fill={C.verde} />
    <rect x="50" y="108" width="60" height="12" rx="6" fill={C.labio} {...b} /><rect x="50" y="107" width="60" height="9" rx="4.5" fill={C.nudo} />
    <path d="M54 50L106 36q-3 9-26 14T54 50Z" fill={C.hueco} />
    <g className="brote-leaves">{dormido
      ? <><path d="M88 44q2-8 0-14" stroke={C.labio} strokeWidth="3.4" strokeLinecap="round" /><path d="M88 31c8 1 13 6 13 13-7-1-12-6-13-13Z" fill={C.hoja} /></>
      : <>{contorno && <path d="M86 45q1-12 6-20" stroke={C.noche} strokeWidth="8" strokeLinecap="round" />}<path d="M86 45q1-12 6-20" stroke={C.labio} strokeWidth="3.4" strokeLinecap="round" />
        <path d={hoja(92, 26)} fill={C.labio} {...b} /><path d={hoja(92, 24)} fill={C.hoja} />
        <path d="M89 33c-6-6-14-7-20-3 5 6 13 7 20 3Z" fill={C.verde} {...b} /></>}</g>
    <path d="M54 59q26-8 52-15v11q-26 7-52 14Z" fill={C.brasa} />
    <path d="M54 66q26-7 52-14v3q-26 7-52 14Z" fill={C.brasaLabio} />
    <path d="M55 61c-12 0-19 6-23 15 9 0 15-5 20-10Z" fill={C.brasa} {...b} /><path d="M54 66c-8 7-11 15-10 23 6-5 9-12 11-19Z" fill={C.brasaLabio} {...b} />
    <circle cx="54" cy="64" r="4.5" fill={C.brasaLabio} />
    <path d="M62 74q-2 16 0 30" stroke="#fff" strokeOpacity=".32" strokeWidth="4.5" strokeLinecap="round" />
  </>
}

/**
 * El logo: la caña de Brote, sin cara, frente al sol (lo que ganas). Fondo noche como la app.
 * `cuadrado` quita las esquinas para los PNG (iOS y Android las recortan solos).
 */
export function LogoArt({ size = 512, cuadrado = false }: { size?: number; cuadrado?: boolean }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="Bambú">
    <rect width="512" height="512" rx={cuadrado ? 0 : 112} fill={MARCA.noche} />
    <circle cx="352" cy="170" r="92" fill={MARCA.sol} />
    <g transform="translate(262 270) scale(2.12) rotate(-7) translate(-80 -112)">
      {/* El segmento de abajo: la misma caña, sin corte. Juntos se leen bambú. */}
      <path d="M54 118H106V196q0 12-12 12H66q-12 0-12-12Z" fill={MARCA.labio} stroke={MARCA.noche} strokeWidth="5" strokeLinejoin="round" />
      <path d="M54 118H106V188q0 12-12 12H66q-12 0-12-12Z" fill={MARCA.verde} />
      <path d="M62 136q-2 22 0 44" stroke="#fff" strokeOpacity=".32" strokeWidth="4.5" strokeLinecap="round" />
      <CanaCuerpo contorno />
    </g>
  </svg>
}
