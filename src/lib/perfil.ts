import { dateKey, type AppData } from './model'
import { esNotaCamara, records, mondayOf } from './libre'
import { gardenStats } from './jardin'
import { levelOf, totalXp, xpOn } from './xp'
import { shiftDay } from './jardin'
import { rankOf } from './rangos'
import { weeklyBoss } from './jefe'
import { adventure } from './aventura'
import { album } from './album'

export type Perfil = {
  uid: string; apodo: string; avatar: number; nivel: number; xp: number; rango: string
  racha: number; mejorRacha: number; jefes: number; monstruos: number; cartas: number
  semanaDe: string; repsSemana: number; kmSemana: number; seriesSemana: number
  records: Record<string, number>; siguiendo: string[]; xpSemana: number; publica: boolean; aprobados: string[]; actualizado?: string
}
export type Dir = { uid: string; apodo: string; avatar: number; nivel: number; privada: boolean; siguiendo: string[]; actualizado?: string }

export const RECORD_EXERCISES: { name: string; kind: 'reps' | 'seconds' }[] = [
  { name: 'Lagartijas', kind: 'reps' }, { name: 'Dominadas', kind: 'reps' }, { name: 'Sentadillas', kind: 'reps' },
  { name: 'Fondos', kind: 'reps' }, { name: 'Burpees', kind: 'reps' }, { name: 'Chin ups', kind: 'reps' },
  { name: 'Handstand push up', kind: 'reps' }, { name: 'Muscle up', kind: 'reps' }, { name: 'Pistol squat', kind: 'reps' },
  { name: 'Plancha', kind: 'seconds' }, { name: 'Wall sit', kind: 'seconds' }, { name: 'Hollow hold', kind: 'seconds' },
  { name: 'L sit', kind: 'seconds' }, { name: 'Handstand libre', kind: 'seconds' }, { name: 'Colgarse de la barra', kind: 'seconds' },
]

export type Board = { id: string; label: string; group: 'General' | 'Semana' | 'Récords'; unit: string; value: (p: Perfil) => number }
const weekOk = (p: Perfil, week: string) => p.semanaDe === week
export function boards(today = dateKey()): Board[] {
  const week = mondayOf(today)
  return [
    { id: 'xp', label: 'Nivel', group: 'General', unit: 'XP', value: p => p.xp },
    { id: 'racha', label: 'Racha', group: 'General', unit: 'días', value: p => p.racha },
    { id: 'jefes', label: 'Jefes vencidos', group: 'General', unit: 'jefes', value: p => p.jefes },
    { id: 'cartas', label: 'Cartas', group: 'General', unit: 'cartas', value: p => p.cartas },
    { id: 'xpSemana', label: 'XP de la semana', group: 'Semana', unit: 'XP', value: p => weekOk(p, week) ? p.xpSemana : 0 },
    { id: 'reps', label: 'Reps de la semana', group: 'Semana', unit: 'reps', value: p => weekOk(p, week) ? p.repsSemana : 0 },
    { id: 'series', label: 'Series de la semana', group: 'Semana', unit: 'series', value: p => weekOk(p, week) ? p.seriesSemana : 0 },
    { id: 'km', label: 'Km de la semana', group: 'Semana', unit: 'km', value: p => weekOk(p, week) ? p.kmSemana : 0 },
    ...RECORD_EXERCISES.map(e => ({ id: `r:${e.name}`, label: e.name, group: 'Récords' as const, unit: e.kind === 'seconds' ? 's' : 'reps', value: (p: Perfil) => p.records[e.name] ?? 0 })),
  ]
}

export function ranking(list: Perfil[], board: Board): { perfil: Perfil; value: number; place: number }[] {
  const sorted = list.map(perfil => ({ perfil, value: board.value(perfil) })).filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value || a.perfil.apodo.localeCompare(b.perfil.apodo))
  let place = 0
  return sorted.map((x, i) => { if (i === 0 || x.value !== sorted[i - 1].value) place = i + 1; return { ...x, place } })
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)))

export function buildPerfil(data: AppData, uid: string, today = dateKey()): Perfil | null {
  const t = data.settings.tablas
  if (!t) return null
  const week = mondayOf(today)
  const xp = totalXp(data, today)
  const nivel = levelOf(xp).level
  const g = gardenStats(data, today)
  const recs = records(data, undefined, true)
  const best: Record<string, number> = {}
  RECORD_EXERCISES.forEach(e => { const r = recs.get(e.name); if (r && r.kind === e.kind && r.best > 0) best[e.name] = clamp(r.best, e.kind === 'seconds' ? 36000 : 2000) })
  const weekSets = data.sets.filter(s => s.day >= week && s.day <= today && esNotaCamara(s.note) && ((s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0))
  const km = data.activities.filter(a => a.day >= week && a.day <= today && a.sport === 'caminar').reduce((m, a) => m + (a.km ?? 0), 0)
  return {
    uid, apodo: t.apodo, avatar: t.avatar, nivel: clamp(nivel, 1000), xp: clamp(xp, 10000000), rango: rankOf(nivel).rank.name,
    racha: clamp(g.current, 100000), mejorRacha: clamp(g.best, 100000), jefes: clamp(weeklyBoss(data, today).wins, 10000),
    monstruos: adventure(data).battles.filter(b => b.defeatedDay).length, cartas: album(data, today).filter(c => c.earned).length,
    semanaDe: week, repsSemana: clamp(weekSets.reduce((m, s) => m + (s.reps ?? 0), 0), 100000), seriesSemana: clamp(weekSets.length, 10000),
    kmSemana: Math.round(Math.min(2000, km) * 10) / 10, records: best,
    siguiendo: (data.settings.amigos ?? []).filter(id => id !== uid), xpSemana: clamp(weekXp(data, week, today), 1000000),
    publica: t.privada !== true, aprobados: t.privada ? (data.settings.aprobados ?? []).filter(id => id !== uid) : [],
  }
}

function weekXp(data: AppData, week: string, today: string): number {
  let sum = 0
  for (let d = week, i = 0; d <= today && i < 7; d = shiftDay(d, 1), i++) sum += xpOn(data, d)
  return sum
}

export const codigoDe = (uid: string) => uid.slice(0, 8)
const plano = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export const dirOf = (p: Perfil): Dir => ({ uid: p.uid, apodo: p.apodo, avatar: p.avatar, nivel: p.nivel, privada: !p.publica, siguiendo: p.siguiendo })
export function buscar<T extends { uid: string; apodo: string }>(list: T[], q: string, uid?: string): T[] {
  const t = plano(q)
  if (!t) return []
  return list.filter(p => p.uid !== uid && (plano(p.apodo).includes(t) || (t.length >= 6 && plano(codigoDe(p.uid)) === t.slice(0, 8))))
}
export type Relacion = 'amigos' | 'agregado' | 'pendiente' | 'teAgrego' | 'nada'
type Lado = { uid: string; siguiendo: string[]; privada?: boolean; publica?: boolean }
export function relacion(me: Lado | null, otro: Lado, opts: { visible?: boolean; pendiente?: boolean } = {}): Relacion {
  if (!me) return 'nada'
  const yo = me.siguiendo.includes(otro.uid)
  const el = otro.siguiendo.includes(me.uid)
  const privada = otro.privada ?? otro.publica === false
  if (yo && privada && opts.visible === false) return opts.pendiente ? 'pendiente' : el ? 'teAgrego' : 'nada'
  return yo && el ? 'amigos' : yo ? 'agregado' : el ? 'teAgrego' : 'nada'
}
export function dirFrom(uid: string, f: Record<string, unknown>): Dir | null {
  const apodo = typeof f.apodo === 'string' ? f.apodo.slice(0, 24) : ''
  if (!apodo) return null
  const n = (k: string) => { const v = Number(f[k]); return Number.isFinite(v) && v >= 0 ? v : 0 }
  return { uid, apodo, avatar: clamp(n('avatar'), 9), nivel: n('nivel'), privada: f.privada === true, siguiendo: Array.isArray(f.siguiendo) ? f.siguiendo.filter((x): x is string => typeof x === 'string').slice(0, 200) : [], actualizado: typeof f.s === 'string' ? f.s : undefined }
}

export function perfilOf(uid: string, f: Record<string, unknown>): Perfil | null {
  const apodo = typeof f.apodo === 'string' ? f.apodo.slice(0, 24) : ''
  if (!apodo) return null
  const n = (k: string) => { const v = Number(f[k]); return Number.isFinite(v) && v >= 0 ? v : 0 }
  const recs = f.records && typeof f.records === 'object' ? f.records as Record<string, unknown> : {}
  return {
    uid, apodo, avatar: clamp(n('avatar'), 9), nivel: n('nivel'), xp: n('xp'), rango: typeof f.rango === 'string' ? f.rango.slice(0, 30) : '',
    racha: n('racha'), mejorRacha: n('mejorRacha'), jefes: n('jefes'), monstruos: n('monstruos'), cartas: n('cartas'),
    semanaDe: typeof f.semanaDe === 'string' ? f.semanaDe : '', repsSemana: n('repsSemana'), kmSemana: n('kmSemana'), seriesSemana: n('seriesSemana'),
    records: Object.fromEntries(RECORD_EXERCISES.map(e => [e.name, Number(recs[e.name])]).filter(([, v]) => Number.isFinite(v) && (v as number) > 0)) as Record<string, number>,
    siguiendo: Array.isArray(f.siguiendo) ? f.siguiendo.filter((x): x is string => typeof x === 'string').slice(0, 200) : [], xpSemana: n('xpSemana'),
    publica: f.publica !== false, aprobados: Array.isArray(f.aprobados) ? f.aprobados.filter((x): x is string => typeof x === 'string').slice(0, 500) : [],
    actualizado: typeof f.s === 'string' ? f.s : undefined,
  }
}

export const sameStats = (a: Perfil | null, b: Perfil | null) => JSON.stringify(a) === JSON.stringify(b)
