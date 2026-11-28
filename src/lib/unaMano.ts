import type { Exercise } from './exercises'

/**
 * v12: series de una mano a la vez. Con una sola pesa (o una mochila) el agarre y la muñeca se hacen
 * mano por mano. Antes "Parar" guardaba la primera mano y la otra se perdía. Ahora la serie espera las
 * dos y cuenta la más débil: es la que limita y la que tiene que crecer.
 */
const POR_MANO: Exercise['slot'][] = ['agarre', 'antebrazo_flex', 'antebrazo_ext']
export const unaManoPorDefecto = (ex: Pick<Exercise, 'id' | 'slot'>): boolean => POR_MANO.includes(ex.slot) || /1arm|una-mano/.test(ex.id)

const KEY = (id: string) => `bambu.unaMano.${id}`
export function leerUnaMano(ex: Pick<Exercise, 'id' | 'slot'>): boolean {
  try { const v = localStorage.getItem(KEY(ex.id)); return v === null ? unaManoPorDefecto(ex) : v === '1' } catch { return unaManoPorDefecto(ex) }
}
export function guardarUnaMano(id: string, on: boolean) { try { localStorage.setItem(KEY(id), on ? '1' : '0') } catch { /* sin preferencia guardada */ } }

/** Junta las dos manos en una serie: el valor es la mano más débil y la nota guarda las dos. */
export function juntarManos(primera: number, segunda: number, unidad: 's' | 'reps'): { value: number; note: string } {
  const u = unidad === 's' ? ' s' : ''
  return { value: Math.min(primera, segunda), note: `Por mano: primera ${primera}${u}, segunda ${segunda}${u}` }
}
