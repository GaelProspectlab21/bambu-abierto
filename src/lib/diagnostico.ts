/**
 * Diagnóstico de entreno (v11.4): cinco preguntas, una por patrón grande, y cada respuesta te
 * pone en el escalón donde puedes hacer el mínimo del rango CON BUENA TÉCNICA. Así el coach no
 * te pide 10 picas si todavía no sale una: empiezas abajo y subes cuando dominas.
 */
import type { AppData } from './model'
import { exercise, ladder, type Exercise, type Slot } from './exercises'

export type Prueba = { slot: Slot; pregunta: string; como: string; opciones: { label: string; id: string }[] }

export const PRUEBAS: Prueba[] = [
  { slot: 'empuje', pregunta: '¿Cuántas lagartijas normales haces seguidas?', como: 'Cuerpo recto de cabeza a talones y el pecho casi al piso. Solo cuentan las limpias.',
    opciones: [{ label: 'Ninguna', id: 'pushup-incline' }, { label: '1 a 4', id: 'pushup-knee' }, { label: '5 a 9', id: 'pushup-knee' }, { label: '10 a 19', id: 'pushup' }, { label: '20 o más', id: 'pushup-diamond' }] },
  { slot: 'hombro', pregunta: '¿Cuántas lagartijas pica (pike) haces?', como: 'Cadera arriba, cuerpo en V al revés, y la cabeza baja hasta casi tocar el piso entre tus manos.',
    opciones: [{ label: 'Ninguna', id: 'pike-hold' }, { label: '1 a 5', id: 'pike-negative' }, { label: '6 a 11', id: 'pike' }, { label: '12 o más', id: 'pike-elevated' }] },
  { slot: 'jalon', pregunta: '¿Cuántos remos bajo una mesa haces?', como: 'Acostado bajo una mesa firme, jala el pecho hacia el borde con el cuerpo recto.',
    opciones: [{ label: 'Ninguno o no tengo mesa', id: 'row-backpack' }, { label: '1 a 9', id: 'row-backpack' }, { label: '10 a 14', id: 'row-table' }, { label: '15 o más', id: 'row-table-straight' }] },
  { slot: 'pierna', pregunta: '¿Cuántas sentadillas profundas haces seguidas?', como: 'Talones en el piso y la cadera por debajo de las rodillas.',
    opciones: [{ label: 'Menos de 12', id: 'squat' }, { label: '12 a 24', id: 'squat' }, { label: '25 a 39', id: 'lunge' }, { label: '40 o más', id: 'split-squat' }] },
  { slot: 'core', pregunta: '¿Cuánto aguantas en plancha?', como: 'Sobre antebrazos, cuerpo recto, sin que la cadera se caiga.',
    opciones: [{ label: 'Menos de 20 segundos', id: 'plank' }, { label: '20 a 59 segundos', id: 'plank' }, { label: '1 minuto o más', id: 'hollow' }] },
]

const usable = (e: Exercise, equipment: string[]) => e.equipment.every(q => q === 'nada' || equipment.includes(q))

/** Si te falta el equipo de ese escalón, baja al más alto que sí puedes hacer en casa. */
export function escalonPara(id: string, equipment: string[]): Exercise | undefined {
  const e = exercise(id)
  if (!e) return undefined
  if (usable(e, equipment)) return e
  // Si ningún escalón cabe en tu equipo (espalda pide mochila o mesa), se queda el de tu respuesta: una mochila la tiene cualquiera.
  return ladder(e.slot).filter(x => x.level <= e.level && usable(x, equipment)).pop() ?? ladder(e.slot).find(x => usable(x, equipment)) ?? e
}

/** Guarda el resultado: un escalón por patrón y la fecha. Respuestas es índice de opción por patrón. */
export function aplicarDiagnostico(data: AppData, respuestas: Partial<Record<Slot, number>>, day: string, now = Date.now()): AppData {
  const escalones = { ...(data.settings.escalones ?? {}) }
  for (const p of PRUEBAS) {
    const i = respuestas[p.slot]
    if (i === undefined || !p.opciones[i]) continue
    const e = escalonPara(p.opciones[i].id, data.settings.equipment)
    if (e) escalones[p.slot] = { id: e.id, at: now }
  }
  return { ...data, settings: { ...data.settings, escalones, diagnostico: day } }
}

/** "No me sale con buena técnica": baja un escalón en ese patrón desde ya. */
export function bajarEscalon(data: AppData, slot: Slot, toId: string, now = Date.now()): AppData {
  return { ...data, settings: { ...data.settings, escalones: { ...(data.settings.escalones ?? {}), [slot]: { id: toId, at: now } } } }
}
