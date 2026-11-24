/**
 * Íconos propios de bambú, trazo de 2 px y puntas redondas, un solo color (currentColor).
 * Reemplazan los glifos de texto (◷ ❧ ✓) que cada teléfono dibujaba distinto.
 */
export type IconName = 'hoy' | 'lectura' | 'entrenar' | 'tareas' | 'mas' | 'noche' | 'habitos' | 'historial' | 'ajustes' | 'mas-grande' | 'racha' | 'voto' | 'rescate' | 'enfoque' | 'cerrar' | 'check' | 'estirar' | 'comida'

const PATHS: Record<IconName, string> = {
  hoy: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z',
  lectura: 'M12 7c-2-1.6-4.6-2-8-2v13c3.4 0 6 .4 8 2m0-13c2-1.6 4.6-2 8-2v13c-3.4 0-6 .4-8 2m0-13v13',
  entrenar: 'M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12',
  tareas: 'M5 6.5h1.5M5 12h1.5M5 17.5h1.5M10 6.5h9M10 12h9M10 17.5h6',
  mas: 'M6 12h.01M12 12h.01M18 12h.01',
  noche: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  habitos: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-4-9 2.8 2.8L16.5 9',
  historial: 'M4 19V9m5.3 10V5m5.4 14v-7M20 19v-4',
  ajustes: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4',
  'mas-grande': 'M12 5v14M5 12h14',
  racha: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.5 2.6-5.3 3.8-8.8 2 1.4 2.6 3 2.6 4.6 1-1 1.6-2.2 1.8-3.6 2.7 2 4.8 4.9 4.8 8 0 3.5-2.7 6-6.5 6z',
  voto: 'M12 20V10m0 0c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6zm0 0c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z',
  rescate: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5v4.5l3 2',
  enfoque: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  cerrar: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  comida: 'M4 11h16a8 8 0 0 1-16 0zM9 3.5c-.8 1-.8 2 0 3M12 3c-.8 1-.8 2 0 3M15 3.5c-.8 1-.8 2 0 3',
  estirar: 'M13.5 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM5 8.5l7 2 7-2M12 10.5v4l-3.5 5.5M12 14.5l3.5 5.5',
}

export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'mas' ? 3.2 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>
}
