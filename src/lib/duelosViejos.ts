import type { Duelo } from './nube'

export const DUELO_EJ = ['Lagartijas', 'Sentadillas', 'Fondos', 'Dominadas', 'Burpees', 'Jumping jacks']
export const DUELO_SEG = 60
export const VENCE = 48 * 3600 * 1000
export const GUARDA = 7 * 86400 * 1000

export type EstadoDuelo = 'te-toca' | 'esperando' | 'vencido' | 'gane' | 'perdi' | 'empate'

export function estadoDe(d: Duelo, uid: string, ahora = Date.now()): EstadoDuelo {
  if (d.estado === 'abierto' || d.paraReps === null) {
    if (d.creado && ahora - d.creado > VENCE) return 'vencido'
    return d.para === uid ? 'te-toca' : 'esperando'
  }
  const mio = d.de === uid ? d.deReps : d.paraReps
  const suyo = d.de === uid ? d.paraReps : d.deReps
  return mio > suyo ? 'gane' : mio < suyo ? 'perdi' : 'empate'
}

export function rivalDe(d: Duelo, uid: string): string {
  return d.de === uid ? d.para : d.de
}

export function visibles(lista: Duelo[], uid: string, ahora = Date.now()): Duelo[] {
  return lista.filter(d => {
    const e = estadoDe(d, uid, ahora)
    if (e === 'te-toca' || e === 'esperando') return true
    const cuando = Math.max(d.creado, d.respondido)
    return !cuando || ahora - cuando <= GUARDA
  })
}

export function marcador(lista: Duelo[], uid: string, desde: number, ahora = Date.now()): { ganados: number; perdidos: number; empates: number } {
  const r = { ganados: 0, perdidos: 0, empates: 0 }
  for (const d of lista) {
    if (d.estado !== 'listo' || Math.max(d.creado, d.respondido) < desde) continue
    const e = estadoDe(d, uid, ahora)
    if (e === 'gane') r.ganados++
    else if (e === 'perdi') r.perdidos++
    else if (e === 'empate') r.empates++
  }
  return r
}

export function abiertoCon(lista: Duelo[], uid: string, rival: string, ahora = Date.now()): boolean {
  return lista.some(d => d.de === uid && d.para === rival && estadoDe(d, uid, ahora) === 'esperando')
}

export type Reloj = { fase: 'espera' | 'cuenta' | 'duelo' | 'fin'; t: number }
export const CUENTA = 3

export function pasoReloj(r: Reloj, ahora: number, visto: boolean, limite: number): { r: Reloj; mostrar: number | null; evento: 'empieza' | 'acaba' | null } {
  if (r.fase === 'fin') return { r, mostrar: 0, evento: null }
  if (r.fase === 'espera') return visto ? { r: { fase: 'cuenta', t: ahora }, mostrar: -CUENTA, evento: null } : { r, mostrar: null, evento: null }
  if (r.fase === 'cuenta') {
    const n = CUENTA - Math.floor((ahora - r.t) / 1000)
    return n <= 0 ? { r: { fase: 'duelo', t: ahora }, mostrar: limite, evento: 'empieza' } : { r, mostrar: -n, evento: null }
  }
  const resta = limite - Math.floor((ahora - r.t) / 1000)
  return resta <= 0 ? { r: { fase: 'fin', t: ahora }, mostrar: 0, evento: 'acaba' } : { r, mostrar: resta, evento: null }
}
