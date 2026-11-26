/**
 * Lo social de Kiki (amigos, duelos, candado por llave, widget y avisos) mientras llega su versión
 * en Supabase (rama `codex/v9-social`). Misma forma que tenía `firebase.ts`: leer devuelve vacío,
 * escribir no hace nada y lo que el usuario pide a propósito avisa que viene pronto.
 * Cuando llegue `nubeSocial.ts`, `nube.ts` re-exporta de ahí y este archivo se borra.
 */
import type { Dir, Perfil } from './perfil'

/** La interfaz esconde Amigos y Duelos mientras esto sea false. */
export const socialListo = false
const PRONTO = 'Amigos y duelos llegan en la próxima versión.'

export type Duelo = { id: string; de: string; para: string; ejercicio: string; deReps: number; paraReps: number | null; estado: 'abierto' | 'listo'; creado: number; respondido: number }
export type EstadoWidget = { dia: string; racha: number; nivel: number; xpHoy: number; meta: number; minutos: number; rutina: string }
export type Suscripcion = { endpoint: string; p256dh: string; auth: string }
export type EstadoAvisos = { ultimo: string; hecho: boolean; racha: number }

export async function publicarPerfil(_p: Perfil): Promise<void> {}
export async function borrarPerfil(_uid: string): Promise<void> {}
export async function directorio(): Promise<Dir[]> { return [] }
export async function perfilesPublicos(): Promise<Perfil[]> { return [] }
export async function perfilDe(_uid: string): Promise<Perfil | null> { return null }
export async function solicitudes(_uid: string): Promise<{ entrantes: string[]; salientes: string[] }> { return { entrantes: [], salientes: [] } }
export async function pedirAmistad(_de: string, _para: string): Promise<void> { throw new Error(PRONTO) }
export async function cancelarSolicitud(_de: string, _para: string): Promise<void> {}

export async function guardarPase(_llave: string, _hasta: string): Promise<void> {}
export async function borrarPase(_llave: string): Promise<void> {}
export async function borrarPases(_uid: string): Promise<void> {}
export const urlPase = (_llave: string) => ''

export async function duelos(_uid: string): Promise<Duelo[]> { return [] }
export async function crearDuelo(_para: string, _ejercicio: string, _reps: number): Promise<string> { throw new Error(PRONTO) }
export async function responderDuelo(_id: string, _reps: number): Promise<void> { throw new Error(PRONTO) }
export async function borrarDuelo(_id: string): Promise<void> {}
export async function borrarDuelos(_uid: string): Promise<void> {}

export async function guardarWidget(_llave: string, _e: EstadoWidget): Promise<void> {}
export async function borrarWidget(_llave: string): Promise<void> {}
export async function borrarWidgets(_uid: string): Promise<void> {}
export const urlWidget = (_llave: string) => ''

export async function guardarAvisos(_uid: string, _sub: Suscripcion, _hora: string, _zona: string, _e: EstadoAvisos): Promise<void> { throw new Error(PRONTO) }
export async function estadoAvisos(_uid: string, _e: EstadoAvisos): Promise<void> {}
export async function borrarAvisos(_uid: string): Promise<void> {}
