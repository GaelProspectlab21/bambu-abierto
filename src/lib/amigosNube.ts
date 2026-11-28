/**
 * Amigos sobre las tablas de Codex (bambu_perfiles, bambu_amistades). RLS deja leer solo tu perfil
 * y el de tus amistades aceptadas; el perfil nace privado y solo se encuentra por código exacto.
 */
import { supabase } from './supabase'
import type { AppData } from './model'
import { gardenStats } from './jardin'
import { miSemana, type Publicado } from './tablaSemana'
import { aceptarAmistad, buscarPorApodo, buscarPorCodigo, cancelarSolicitud, directorio, pedirAmistad, solicitudes } from './nubeSocial'

export { aceptarAmistad, buscarPorApodo, buscarPorCodigo, cancelarSolicitud, pedirAmistad }

function db() { if (!supabase) throw new Error('Entra a tu cuenta para usar amigos.'); return supabase }

export type MiPerfil = { codigo: string; apodo: string } | null

export async function miPerfil(uid: string): Promise<MiPerfil> {
  const { data, error } = await db().from('bambu_perfiles').select('codigo_amigo, apodo').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('No se pudo leer tu perfil. Revisa tu conexión.')
  return data ? { codigo: data.codigo_amigo as string, apodo: data.apodo as string } : null
}

/** Publica tu semana (y crea tu perfil con código si no existía). Solo puntos, oros y racha. */
export async function publicarMiSemana(data: AppData, uid: string, apodo?: string, soloSiExiste = false): Promise<void> {
  const { data: row, error } = await db().from('bambu_perfiles').select('apodo, estadisticas').eq('user_id', uid).maybeSingle()
  if (error) throw new Error('No se pudo leer tu perfil.')
  // Desde Hoy no se crea perfil a nadie: eso solo pasa cuando tocas Crear mi código.
  if (soloSiExiste && !row) return
  const nombre = (apodo ?? (row?.apodo as string | undefined) ?? data.settings.tablas?.apodo ?? data.profile.name ?? 'Yo').trim().slice(0, 24) || 'Yo'
  const previo = row?.estadisticas && typeof row.estadisticas === 'object' ? row.estadisticas as Record<string, unknown> : {}
  const s = miSemana(data)
  const { error: e2 } = await db().from('bambu_perfiles').upsert({
    user_id: uid, apodo: nombre, racha: Math.min(100000, gardenStats(data).current),
    estadisticas: { ...previo, semanaDe: s.semanaDe, puntos: s.puntos, puntosPrev: s.puntosPrev, oros: s.oros },
  }, { onConflict: 'user_id' })
  if (e2) throw new Error('No se pudo guardar tu semana.')
}

/** Tú y tus amigos aceptados, con lo que cada quien publicó. */
export async function semanaDeAmigos(): Promise<Publicado[]> {
  const { data, error } = await db().from('bambu_perfiles').select('user_id, apodo, avatar, racha, estadisticas').limit(50)
  if (error) throw new Error('No se pudo cargar la tabla. Revisa tu conexión.')
  return (data ?? []).map(r => {
    const e = (r.estadisticas ?? {}) as Record<string, unknown>
    const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined
    return { uid: r.user_id as string, apodo: r.apodo as string, avatar: (r.avatar as number) ?? 0, racha: (r.racha as number) ?? 0,
      semanaDe: typeof e.semanaDe === 'string' ? e.semanaDe : undefined, puntos: n(e.puntos), puntosPrev: n(e.puntosPrev), oros: n(e.oros) }
  })
}

export type Pendiente = { uid: string; apodo: string }

/** Solicitudes que te llegaron y las que mandaste, con el apodo (sin estadísticas). */
export async function pendientes(uid: string): Promise<{ entrantes: Pendiente[]; salientes: Pendiente[] }> {
  const [dir, sol] = await Promise.all([directorio(), solicitudes(uid)])
  const apodo = (id: string) => dir.find(d => d.uid === id)?.apodo ?? 'Alguien'
  return { entrantes: sol.entrantes.map(id => ({ uid: id, apodo: apodo(id) })), salientes: sol.salientes.map(id => ({ uid: id, apodo: apodo(id) })) }
}

export async function quitarAmigo(uid: string, otro: string): Promise<void> {
  // El servidor borra la relación en ambos sentidos.
  await cancelarSolicitud(uid, otro)
}
