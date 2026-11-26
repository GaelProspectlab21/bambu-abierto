import { makeId, type Activity, type AppData } from './model'
import { shiftDay } from './jardin'
import { logSet } from './rutina'
import { CAMARA_SET, REDES_SET } from './libre'
import { patronDe, type Patron, type Tipo } from './conteo'

export const CAMARA_NOTE = CAMARA_SET
export const REDES_NOTE = REDES_SET
export const PASE_PREFIX = 'Pase:'
export const PASES = [5, 10, 15] as const

export const TASAS: Record<Patron, { cada: number; min: number; unidad: 'reps' | 's' }> = {
  empuje: { cada: 2, min: 1, unidad: 'reps' },
  fondo: { cada: 2, min: 1, unidad: 'reps' },
  sentadilla: { cada: 4, min: 1, unidad: 'reps' },
  dominada: { cada: 1, min: 2, unidad: 'reps' },
  pike: { cada: 2, min: 1, unidad: 'reps' },
  hspu: { cada: 1, min: 2, unidad: 'reps' },
  remo: { cada: 2, min: 1, unidad: 'reps' },
  elevacion: { cada: 1, min: 1, unidad: 'reps' },
  saltos: { cada: 6, min: 1, unidad: 'reps' },
  burpee: { cada: 1, min: 1, unidad: 'reps' },
  plancha: { cada: 20, min: 1, unidad: 's' },
  lateral: { cada: 20, min: 1, unidad: 's' },
  wallsit: { cada: 20, min: 1, unidad: 's' },
  colgado: { cada: 20, min: 1, unidad: 's' },
  lsit: { cada: 10, min: 1, unidad: 's' },
  parado: { cada: 10, min: 1, unidad: 's' },
  hollow: { cada: 10, min: 1, unidad: 's' },
  planche: { cada: 5, min: 1, unidad: 's' },
  lever: { cada: 5, min: 1, unidad: 's' },
  bandera: { cada: 5, min: 1, unidad: 's' },
  generico: { cada: 4, min: 1, unidad: 'reps' },
  quieto: { cada: 20, min: 1, unidad: 's' },
}
const DIFICIL = /arquer|una (mano|pierna)|pseudo|palmada|explosiv|pistol|shrimp/i
const FACIL = /rodillas|inclinad|en banco|asistid|en (la )?pared/i

export function tasa(exercise: string, kind?: Tipo): { cada: number; min: number; unidad: 'reps' | 's' } | null {
  const p = patronDe(exercise, kind)
  if (!p) return null
  const t = TASAS[p]
  if (DIFICIL.test(exercise)) return t.cada > 1 ? { ...t, cada: Math.ceil(t.cada / 2) } : { ...t, min: t.min * 2 }
  if (FACIL.test(exercise)) return t.min > 1 ? { ...t, min: t.min / 2 } : { ...t, cada: t.cada * 2 }
  return t
}

export function minutosDe(exercise: string, valor: number): number {
  const t = tasa(exercise)
  return t && valor > 0 ? valor / t.cada * t.min : 0
}

function singular(n: string): string {
  let corte = false
  return n.split(' ').map(w => {
    if (corte || /^(de|del|con|en|a|sin|to|al)$/.test(w)) { corte = true; return w }
    if (/^toes$/.test(w)) return w
    if (/ones$/.test(w)) return w.replace(/ones$/, 'ón')
    return w.length > 2 ? w.replace(/s$/, '') : w
  }).join(' ')
}

export function tasaTexto(exercise: string): string {
  const t = tasa(exercise)
  if (!t) return ''
  const n = exercise.toLowerCase()
  const cosa = t.unidad === 's' ? `${t.cada} s de ${n}` : `${t.cada} ${t.cada === 1 ? singular(n) : n}`
  return `${cosa} = ${t.min} min`
}

export function tasaCorta(exercise: string): string {
  const t = tasa(exercise)
  return t ? `${t.cada} ${t.unidad === 's' ? 's' : t.cada === 1 ? 'rep' : 'reps'} = ${t.min} min` : ''
}

export function faltan(exercise: string, minutos: number): number {
  const t = tasa(exercise)
  return t ? Math.ceil(Math.max(0, minutos) / t.min * t.cada) : 0
}

export function ganados(data: AppData, day: string): number {
  return Math.floor(data.sets.filter(s => s.day === day && s.note === REDES_NOTE).reduce((m, s) => m + minutosDe(s.exercise, s.seconds ?? s.reps ?? 0), 0) + 1e-9)
}

export function paseMinutos(a: Activity): number {
  if (a.kind !== 'other' || !(a.note ?? '').startsWith(PASE_PREFIX)) return 0
  const m = /(\d{1,3}) min$/.exec(a.note ?? '')
  return m ? Number(m[1]) : 0
}

export function gastados(data: AppData, day: string): number {
  return data.activities.filter(a => a.day === day).reduce((m, a) => m + paseMinutos(a), 0)
}

export function saldo(data: AppData, day: string): number {
  return Math.max(0, ganados(data, day) - gastados(data, day))
}

export function semanaMinutos(data: AppData, today: string): { ganados: number; gastados: number } {
  let g = 0, u = 0
  for (let i = 0; i < 7; i++) { const d = shiftDay(today, -i); g += ganados(data, d); u += gastados(data, d) }
  return { ganados: g, gastados: u }
}

export function paseActivity(day: string, app: string, minutos: number): Activity {
  return { id: `pase:${makeId()}`, day, kind: 'other', note: `${PASE_PREFIX} ${app.slice(0, 20)} · ${minutos} min` }
}

export function hastaISO(ms: number): string {
  const d = new Date(ms)
  const off = -d.getTimezoneOffset()
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(off / 60)}:${p(off % 60)}`
}

export function nuevaLlave(): string {
  const a = new Uint8Array(18)
  crypto.getRandomValues(a)
  return Array.from(a, b => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('')
}

export function conCamara(data: AppData, day: string, exercise: string, kind: 'reps' | 'seconds', valor: number, now = Date.now(), redes = false): AppData {
  const n = logSet(data, day, { id: redes ? 'redes' : 'camara', name: exercise, kind, target: 0 }, valor, now)
  const last = n.sets[n.sets.length - 1]
  return { ...n, sets: [...n.sets.slice(0, -1), { ...last, note: redes ? REDES_NOTE : CAMARA_NOTE }] }
}
