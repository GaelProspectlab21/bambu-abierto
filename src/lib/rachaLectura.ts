import type { AppData } from './model'
import { realReading, shiftDay } from './progress'

/**
 * v12: la racha de lectura con escudos.
 * Antes: un día sin leer y la racha volvía a cero, aunque llevaras 40. Eso castiga justo a quien más
 * constante es y da ganas de tirar todo ("ya la perdí").
 * Ahora: cada 7 días leídos seguidos GANAS un escudo (máximo 2). Si un día se te va, el escudo lo cubre
 * solo y la racha sigue (ese día no suma, solo no rompe). Se gana leyendo, nunca al azar.
 * Hoy sin leer todavía no rompe nada: la racha está viva hasta medianoche.
 */
export const HITOS = [3, 7, 14, 30, 50, 100, 200, 365] as const
export const DIAS_POR_ESCUDO = 7
export const MAX_ESCUDOS = 2

export type DiaRacha = { day: string; estado: 'leido' | 'protegido' | 'hoy' | 'falta' | 'antes' }
export type RachaLectura = {
  actual: number; mejor: number; escudos: number; hoyHecho: boolean; enRiesgo: boolean
  protegidos: string[]; semana: DiaRacha[]; hito: number | null; faltan: number; paraEscudo: number
}

export function rachaLectura(dias: Iterable<string>, today: string): RachaLectura {
  const leidos = new Set([...dias].filter(d => d <= today))
  const orden = [...leidos].sort()
  let run = 0, mejor = 0, escudos = 0
  const protegidos: string[] = []
  if (orden.length) {
    for (let d = orden[0]; d <= today; d = shiftDay(d, 1)) {
      if (leidos.has(d)) {
        run++
        mejor = Math.max(mejor, run)
        if (run % DIAS_POR_ESCUDO === 0) escudos = Math.min(MAX_ESCUDOS, escudos + 1)
      } else if (d !== today) {
        if (run > 0 && escudos > 0) { escudos--; protegidos.push(d) } else { run = 0; escudos = 0 }
      }
    }
  }
  const prot = new Set(protegidos)
  const hoyHecho = leidos.has(today)
  const primero = orden[0] ?? today
  const semana: DiaRacha[] = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6)
    return { day, estado: leidos.has(day) ? 'leido' : prot.has(day) ? 'protegido' : day === today ? 'hoy' : day < primero ? 'antes' : 'falta' }
  })
  const hito = HITOS.find(h => h > run) ?? null
  return {
    actual: run, mejor, escudos, hoyHecho, protegidos, semana, hito,
    faltan: hito ? hito - run : 0,
    paraEscudo: escudos >= MAX_ESCUDOS ? 0 : DIAS_POR_ESCUDO - (run % DIAS_POR_ESCUDO),
    // En riesgo: llevas racha, hoy no has leído y ya no te queda escudo que la cubra.
    enRiesgo: run > 0 && !hoyHecho && escudos === 0,
  }
}

export const rachaDe = (data: AppData, today: string) => rachaLectura(data.reading.filter(realReading).map(r => r.day), today)

/** El hito más alto ya alcanzado (para no festejar dos veces el mismo). */
export const hitoAlcanzado = (actual: number) => [...HITOS].reverse().find(h => h <= actual) ?? 0
