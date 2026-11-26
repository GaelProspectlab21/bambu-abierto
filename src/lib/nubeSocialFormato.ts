import { perfilOf, type Perfil } from './perfil'

export type Duelo = { id: string; de: string; para: string; ejercicio: string; deReps: number; paraReps: number | null; estado: 'abierto' | 'listo'; creado: number; respondido: number }
export type EstadoWidget = { dia: string; racha: number; nivel: number; xpHoy: number; meta: number; minutos: number; rutina: string }
export type Amistad = { de: string; para: string; estado: 'pendiente' | 'aceptada' }

export function codigoAmigo(codigo: string): string {
  const clean = codigo.trim().toUpperCase()
  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(clean)) throw new Error('Revisa el código de tu amigo. Debe tener ocho caracteres.')
  return clean
}
export function repeticiones(reps: number): number {
  if (!Number.isFinite(reps) || reps < 0 || reps > 300) throw new Error('Escribe entre 0 y 300 repeticiones.')
  return Math.round(reps)
}
export function llaveSocial(llave: string): string {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(llave)) throw new Error('Esta llave no es válida. Crea una nueva desde la app.')
  return llave
}
export function enlaceLlave(base: string, tipo: 'pase' | 'widget', llave: string): string {
  return `${base.replace(/\/$/, '')}/functions/v1/bambu-llave?tipo=${tipo}&k=${encodeURIComponent(llaveSocial(llave))}`
}
export function perfilFila(p: Perfil) {
  return {
    user_id: p.uid, apodo: p.apodo, avatar: p.avatar, nivel: p.nivel, racha: p.racha,
    xp_semana: p.xpSemana, reps_semana: p.repsSemana, records: p.records,
    privado: p.publica !== true,
    estadisticas: { xp: p.xp, rango: p.rango, mejorRacha: p.mejorRacha, jefes: p.jefes, monstruos: p.monstruos, cartas: p.cartas, semanaDe: p.semanaDe, kmSemana: p.kmSemana, seriesSemana: p.seriesSemana },
  }
}
export function perfilDesdeFila(row: Record<string, unknown>, amistades: Amistad[]): Perfil | null {
  if (typeof row.user_id !== 'string') return null
  const uid = row.user_id
  const amigos = amistades.filter(a => a.estado === 'aceptada' && (a.de === uid || a.para === uid)).map(a => a.de === uid ? a.para : a.de)
  const extra = row.estadisticas && typeof row.estadisticas === 'object' ? row.estadisticas : {}
  return perfilOf(uid, { ...extra, apodo: row.apodo, avatar: row.avatar, nivel: row.nivel, racha: row.racha, xpSemana: row.xp_semana, repsSemana: row.reps_semana, records: row.records, publica: row.privado === false, siguiendo: amigos, aprobados: amigos, s: row.updated_at })
}
export function dueloDesdeFila(row: Record<string, unknown>): Duelo {
  const ms = (v: unknown) => typeof v === 'string' ? Date.parse(v) || 0 : 0
  return { id: String(row.id), de: String(row.de), para: String(row.para), ejercicio: String(row.ejercicio), deReps: Number(row.de_reps), paraReps: row.para_reps == null ? null : Number(row.para_reps), estado: row.estado === 'listo' ? 'listo' : 'abierto', creado: ms(row.creado), respondido: ms(row.respondido) }
}
