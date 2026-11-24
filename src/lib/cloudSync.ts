/**
 * Lectura del formato viejo (un JSON por usuario en bambu_user_data). Bambú v3 ya no
 * escribe ahí: solo lo lee una vez para migrar si la tabla de registros está vacía.
 */
import { normalizeData, type AppData } from './model'
import { supabase } from './supabase'

export type CloudSnapshot = { data: AppData; revision: number }

export async function readCloudSnapshot(userId: string): Promise<CloudSnapshot | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('bambu_user_data').select('revision,payload').eq('user_id', userId).abortSignal(AbortSignal.timeout(15000)).maybeSingle()
  if (error) throw new Error('No se pudo leer el espacio anterior.')
  if (!data) return null
  const row = data as { revision: number; payload: unknown }
  return { data: normalizeData(row.payload), revision: row.revision }
}
