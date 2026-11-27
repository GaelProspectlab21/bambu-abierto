/**
 * Lo social de Kiki (amigos, duelos, candado por llave, widget y avisos) mientras llega su versión
 * en Supabase (rama `codex/v9-social`). Misma forma que tenía `firebase.ts`: leer devuelve vacío,
 * escribir no hace nada y lo que el usuario pide a propósito avisa que viene pronto.
 * Cuando llegue `nubeSocial.ts`, `nube.ts` re-exporta de ahí y este archivo se borra.
 */

/** La interfaz esconde Amigos y Duelos mientras esto sea false. */
export const socialListo = false
const PRONTO = 'Amigos y duelos llegan en la próxima versión.'

export type Suscripcion = { endpoint: string; p256dh: string; auth: string }
export type EstadoAvisos = { ultimo: string; hecho: boolean; racha: number }

// v10.2: amigos, duelos, pases y widget ya viven en Supabase (migración social aplicada el 26-nov).
export * from './nubeSocial'
import { cloudConfigured } from './supabase'
/** Amigos y duelos funcionan con cuenta. Avisos y widget de Kiki siguen apagados (socialListo). */
export const amigosListo = cloudConfigured

export async function guardarAvisos(_uid: string, _sub: Suscripcion, _hora: string, _zona: string, _e: EstadoAvisos): Promise<void> { throw new Error(PRONTO) }
export async function estadoAvisos(_uid: string, _e: EstadoAvisos): Promise<void> {}
export async function borrarAvisos(_uid: string): Promise<void> {}
