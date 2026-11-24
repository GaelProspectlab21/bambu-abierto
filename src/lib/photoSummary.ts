/**
 * Lo que dicen TUS DATOS entre dos fotos de progreso. Es la parte objetiva del feedback:
 * días transcurridos, promedio de peso alrededor de cada foto y días con entreno.
 * Nunca opina del cuerpo; eso lo dejas para un adulto o entrenador.
 */
import { shift } from './coach'
import type { AppData } from './model'
import { plural } from './text'

export type PhotoSummary = { days: number; weightFrom: number | null; weightTo: number | null; trainDays: number; lines: string[] }

function weightAround(data: AppData, day: string): number | null {
  const rows = data.body.filter(b => b.weightKg && b.day >= shift(day, -3) && b.day <= shift(day, 3)).map(b => b.weightKg!)
  return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : null
}

export function photoSummary(data: AppData, from: string, to: string): PhotoSummary {
  const [a, b] = from <= to ? [from, to] : [to, from]
  const days = Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000)
  const weightFrom = weightAround(data, a), weightTo = weightAround(data, b)
  const trainDays = new Set(data.sets.filter(s => s.day > a && s.day <= b).map(s => s.day)).size
  const lines: string[] = []
  if (days < 1) { lines.push('Son del mismo día: compara mejor con una foto de hace semanas.'); return { days, weightFrom, weightTo, trainDays, lines } }
  lines.push(`Entre las dos fotos pasaron ${plural(days, 'día', 'días')} y entrenaste ${trainDays}.`)
  if (weightFrom && weightTo) {
    const diff = weightTo - weightFrom
    lines.push(`Tu promedio de peso fue de ${weightFrom.toFixed(1)} a ${weightTo.toFixed(1)} kg (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}). Mira el promedio, nunca el día.`)
  } else lines.push('Faltan pesos alrededor de esas fotos para comparar el promedio.')
  if (days < 21) lines.push('Tres semanas es poco para ver cambio en el espejo. La comparación buena es de meses.')
  return { days, weightFrom, weightTo, trainDays, lines }
}
