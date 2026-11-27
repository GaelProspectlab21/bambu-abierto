/**
 * La tabla de la semana con amigos (producto/GAMIFICACION.md, paso 3).
 *
 * Círculo cerrado 1 punto, de oro 2, máximo 6 al día. La tabla se reinicia cada lunes.
 * Dos ganadores: el que más puntos junta y el que más mejoró contra su semana pasada,
 * para que el que va abajo también tenga por qué pelear.
 * Lo único que ven tus amigos: apodo, puntos, oros y racha. Nunca qué leíste ni tus tareas.
 */
import { dateKey, type AppData } from './model'
import { mondayOf } from './libre'
import { shiftDay } from './jardin'
import { anillosDe } from './anillos'
import { oroDe, puntosDia, RINGS } from './oro'

export type MiSemana = { semanaDe: string; puntos: number; puntosPrev: number; oros: number; dias3: number }

function sumWeek(data: AppData, monday: string, until: string): { puntos: number; oros: number; dias3: number } {
  let puntos = 0, oros = 0, dias3 = 0
  for (let d = monday, i = 0; i < 7 && d <= until; d = shiftDay(d, 1), i++) {
    puntos += puntosDia(data, d)
    const a = anillosDe(data, d), o = oroDe(data, d, a)
    oros += RINGS.filter(r => o[r]).length
    if (RINGS.every(r => a[r] === null || (a[r] as number) >= 1)) dias3++
  }
  return { puntos, oros, dias3 }
}

export function miSemana(data: AppData, today = dateKey()): MiSemana {
  const monday = mondayOf(today)
  const prevMonday = shiftDay(monday, -7)
  const cur = sumWeek(data, monday, today)
  const prev = sumWeek(data, prevMonday, shiftDay(monday, -1))
  return { semanaDe: monday, puntos: cur.puntos, puntosPrev: prev.puntos, oros: cur.oros, dias3: cur.dias3 }
}

export type Fila = { uid: string; apodo: string; avatar: number; racha: number; puntos: number; oros: number; mejora: number; yo: boolean; lugar: number }

/** Lo que publicó cada quien. Si su semana guardada no es la de hoy, cuenta como cero (la tabla se reinicia el lunes). */
export type Publicado = { uid: string; apodo: string; avatar: number; racha: number; semanaDe?: string; puntos?: number; puntosPrev?: number; oros?: number }

export function tabla(lista: Publicado[], yo: string, today = dateKey()): { filas: Fila[]; lider: string | null; mejoro: string | null } {
  const monday = mondayOf(today)
  const filas = lista.map(p => {
    const vigente = p.semanaDe === monday
    const puntos = vigente ? Math.max(0, Math.min(42, p.puntos ?? 0)) : 0
    const prev = vigente ? Math.max(0, Math.min(42, p.puntosPrev ?? 0)) : (p.semanaDe === shiftDay(monday, -7) ? Math.min(42, p.puntos ?? 0) : 0)
    return { uid: p.uid, apodo: p.apodo, avatar: p.avatar, racha: p.racha, puntos, oros: vigente ? Math.max(0, p.oros ?? 0) : 0, mejora: puntos - prev, yo: p.uid === yo, lugar: 0 }
  }).sort((a, b) => b.puntos - a.puntos || b.oros - a.oros || a.apodo.localeCompare(b.apodo))
  filas.forEach((f, i) => { f.lugar = i > 0 && filas[i - 1].puntos === f.puntos && filas[i - 1].oros === f.oros ? filas[i - 1].lugar : i + 1 })
  const lider = filas.length > 1 && filas[0].puntos > 0 ? filas[0].uid : null
  const mejores = [...filas].filter(f => f.mejora > 0).sort((a, b) => b.mejora - a.mejora)
  const mejoro = mejores.length && filas.length > 1 ? mejores[0].uid : null
  return { filas, lider, mejoro }
}
