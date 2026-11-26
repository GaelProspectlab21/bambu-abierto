export type Wod = { nombre: string; seg: number; partes: { ej: string; reps: number }[]; como: string; reglas: string[] }

export const WODS: Record<string, Wod> = {
  cindy: {
    nombre: 'Cindy',
    seg: 1200,
    partes: [{ ej: 'Dominadas', reps: 5 }, { ej: 'Lagartijas', reps: 10 }, { ej: 'Sentadillas', reps: 15 }],
    como: 'Pon el teléfono de lado a unos 3 metros, que se vean la barra y el piso.',
    reglas: ['20 minutos: 5 dominadas, 10 lagartijas y 15 sentadillas. Todas las rondas que puedas.', 'Cuando terminas un ejercicio te digo cuál sigue.', 'Media repetición vale cero. Si sales de Bambú se guarda lo que llevas.'],
  },
}

export const wodDe = (nombre: string): Wod | undefined => WODS[nombre.trim().toLowerCase()]
export const porRonda = (w: Wod) => w.partes.reduce((m, p) => m + p.reps, 0)
export function totalWod(w: Wod, rondas: number, i: number, actuales: number): number {
  return rondas * porRonda(w) + w.partes.slice(0, i).reduce((m, p) => m + p.reps, 0) + Math.min(actuales, w.partes[i]?.reps ?? 0)
}
export function wodTexto(w: Wod, total: number): string {
  const r = porRonda(w), rondas = Math.floor(total / r), resto = total % r
  return `${rondas} ${rondas === 1 ? 'ronda' : 'rondas'}${resto ? ` + ${resto}` : ''}`
}
export function siguiente(w: Wod, i: number, rondas: number): { i: number; rondas: number } {
  const n = (i + 1) % w.partes.length
  return { i: n, rondas: rondas + (n === 0 ? 1 : 0) }
}
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
