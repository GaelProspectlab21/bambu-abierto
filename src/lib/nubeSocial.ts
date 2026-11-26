import { supabase } from './supabase'
import { type Dir, type Perfil } from './perfil'
import { DUELO_EJ } from './duelos'
import { codigoAmigo, dueloDesdeFila, enlaceLlave, llaveSocial, perfilDesdeFila, perfilFila, repeticiones, type Amistad, type Duelo, type EstadoWidget } from './nubeSocialFormato'
export type { Duelo, EstadoWidget } from './nubeSocialFormato'

function db() {
  if (!supabase) throw new Error('Inicia sesión para usar amigos, duelos y enlaces.')
  return supabase
}
function revisar(error: { code?: string } | null): void {
  if (!error) return
  if (error.code === '23505') throw new Error('Ese registro ya existe. Actualiza e intenta de nuevo.')
  if (error.code === '23514' || error.code === '22P02') throw new Error('Revisa los datos e intenta de nuevo.')
  if (error.code === '42501' || error.code === '28000') throw new Error('Tu cuenta no tiene permiso para hacer eso.')
  throw new Error('No se pudo completar. Revisa tu conexión e intenta de nuevo.')
}
async function yo(uid?: string) {
  const { data, error } = await db().auth.getUser()
  if (error || !data.user) throw new Error('Inicia sesión para continuar.')
  if (uid !== undefined && uid !== data.user.id) throw new Error('Solo puedes cambiar los datos de tu cuenta.')
  return data.user.id
}
async function amistades(): Promise<Amistad[]> {
  const result: Amistad[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('bambu_amistades').select('de,para,estado').order('de').order('para').range(from, from + 999)
    revisar(error)
    result.push(...(data ?? []) as Amistad[])
    if (!data || data.length < 1000) return result
  }
}

export async function publicarPerfil(p: Perfil): Promise<void> {
  await yo(p.uid)
  // No publicar listas locales de permisos: la amistad se acepta en el servidor.
  const { error } = await db().from('bambu_perfiles').upsert(perfilFila(p), { onConflict: 'user_id' })
  revisar(error)
}
export async function borrarPerfil(uid: string): Promise<void> {
  await yo(uid)
  revisar((await db().from('bambu_perfiles').delete().eq('user_id', uid)).error)
}
export async function directorio(): Promise<Dir[]> {
  await yo()
  const result: Dir[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().rpc('bambu_directorio').order('uid').range(from, from + 999)
    revisar(error)
    result.push(...(data ?? []) as Dir[])
    if (!data || data.length < 1000) return result
  }
}
export async function perfilesPublicos(): Promise<Perfil[]> {
  const uid = await yo(), friends = await amistades()
  const result: Perfil[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('bambu_perfiles').select('*').neq('user_id', uid).order('user_id').range(from, from + 999)
    revisar(error)
    for (const row of data ?? []) { const p = perfilDesdeFila(row, friends); if (p) result.push(p) }
    if (!data || data.length < 1000) return result
  }
}
export async function perfilDe(uid: string): Promise<Perfil | null> {
  await yo()
  const { data, error } = await db().from('bambu_perfiles').select('*').eq('user_id', uid).maybeSingle()
  revisar(error)
  return data ? perfilDesdeFila(data, await amistades()) : null
}
export async function buscarPorCodigo(codigo: string): Promise<{ apodo: string; avatar: number } | null> {
  const { data, error } = await db().rpc('bambu_buscar_por_codigo', { p_codigo: codigoAmigo(codigo) })
  revisar(error)
  return data?.[0] ?? null
}
export async function miCodigoAmigo(): Promise<string | null> {
  const { data, error } = await db().from('bambu_perfiles').select('codigo_amigo').eq('user_id', await yo()).maybeSingle()
  revisar(error)
  return data?.codigo_amigo ?? null
}
export async function solicitudes(uid: string): Promise<{ entrantes: string[]; salientes: string[] }> {
  await yo(uid)
  const rows = (await amistades()).filter(a => a.estado === 'pendiente')
  return { entrantes: rows.filter(a => a.para === uid).map(a => a.de), salientes: rows.filter(a => a.de === uid).map(a => a.para) }
}
export async function pedirAmistad(de: string, para: string): Promise<void> {
  await yo(de)
  // Un código exacto inicia la amistad. Un uid solo sirve para una relación existente.
  revisar((await db().rpc('bambu_pedir_amistad', { p_para: para })).error)
}
export async function aceptarAmistad(de: string): Promise<void> {
  revisar((await db().rpc('bambu_responder_amistad', { p_de: de, p_aceptar: true })).error)
}
export async function cancelarSolicitud(de: string, para: string): Promise<void> {
  await yo()
  revisar((await db().rpc('bambu_cancelar_amistad', { p_de: de, p_para: para })).error)
}

export async function guardarPase(llave: string, hasta: string): Promise<void> {
  if (!Number.isFinite(Date.parse(hasta))) throw new Error('Revisa la fecha del pase.')
  revisar((await db().from('bambu_pases').upsert({ llave: llaveSocial(llave), user_id: await yo(), hasta: new Date(hasta).toISOString() }, { onConflict: 'llave' })).error)
}
export async function borrarPase(llave: string): Promise<void> {
  revisar((await db().from('bambu_pases').delete().eq('user_id', await yo()).eq('llave', llaveSocial(llave))).error)
}
export async function borrarPases(uid: string): Promise<void> {
  await yo(uid)
  revisar((await db().from('bambu_pases').delete().eq('user_id', uid)).error)
}
function baseLlave(): string {
  db()
  return import.meta.env.VITE_SUPABASE_URL!.trim()
}
export const urlPase = (llave: string) => enlaceLlave(baseLlave(), 'pase', llave)

export async function duelos(uid: string): Promise<Duelo[]> {
  await yo(uid)
  const rows: Duelo[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('bambu_duelos').select('*').or(`de.eq.${uid},para.eq.${uid}`).order('creado', { ascending: false }).order('id').range(from, from + 999)
    revisar(error)
    rows.push(...(data ?? []).map(dueloDesdeFila))
    if (!data || data.length < 1000) return rows.sort((a, b) => Math.max(b.creado, b.respondido) - Math.max(a.creado, a.respondido))
  }
}
export async function crearDuelo(para: string, ejercicio: string, reps: number): Promise<string> {
  if (!DUELO_EJ.includes(ejercicio)) throw new Error('Elige uno de los ejercicios del duelo.')
  const { data, error } = await db().from('bambu_duelos').insert({ de: await yo(), para, ejercicio, de_reps: repeticiones(reps) }).select('id').single()
  revisar(error)
  if (!data) throw new Error('No se pudo crear el duelo. Intenta de nuevo.')
  return data.id
}
export async function responderDuelo(id: string, reps: number): Promise<void> {
  revisar((await db().rpc('bambu_responder_duelo', { p_id: id, p_reps: repeticiones(reps) })).error)
}
export async function borrarDuelo(id: string): Promise<void> {
  const uid = await yo()
  revisar((await db().from('bambu_duelos').delete().eq('id', id).or(`de.eq.${uid},para.eq.${uid}`)).error)
}
export async function borrarDuelos(uid: string): Promise<void> {
  await yo(uid)
  revisar((await db().from('bambu_duelos').delete().or(`de.eq.${uid},para.eq.${uid}`)).error)
}
export async function guardarWidget(llave: string, e: EstadoWidget): Promise<void> {
  revisar((await db().from('bambu_widget').upsert({ llave: llaveSocial(llave), user_id: await yo(), estado: e }, { onConflict: 'llave' })).error)
}
export async function borrarWidget(llave: string): Promise<void> {
  revisar((await db().from('bambu_widget').delete().eq('user_id', await yo()).eq('llave', llaveSocial(llave))).error)
}
export async function borrarWidgets(uid: string): Promise<void> {
  await yo(uid)
  revisar((await db().from('bambu_widget').delete().eq('user_id', uid)).error)
}
export const urlWidget = (llave: string) => enlaceLlave(baseLlave(), 'widget', llave)
