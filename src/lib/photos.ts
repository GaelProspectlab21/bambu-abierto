/**
 * Fotos de progreso. Viven SOLO en este teléfono (IndexedDB, aparte de los registros que se
 * sincronizan): una foto del cuerpo de un menor no sube a ninguna nube sin que tú lo decidas.
 * Se comprimen a 1280 px para que ocupen unos 150 KB cada una.
 */
import { getLocalOwnerId } from './storage'
export type Pose = 'frente' | 'lado' | 'espalda'
export type Photo = { id: string; day: string; pose: Pose; blob: Blob; w: number; h: number; note?: string; at: number }

const STORE = 'photos'
let photoOwner = 'signed-out'
export async function setPhotoOwner(owner: string): Promise<void> {
  // Bind the legacy photo library once, before the app changes its cloud owner.
  if (!localStorage.getItem('bambu.photos.legacy-owner')) {
    localStorage.setItem('bambu.photos.legacy-owner', await getLocalOwnerId() || 'local')
  }
  photoOwner = owner
}
function databaseName(): string {
  return localStorage.getItem('bambu.photos.legacy-owner') === photoOwner ? 'bambu-photos' : `bambu-photos-${photoOwner}`
}
export async function clearOwnPhotos(): Promise<void> {
  await run('readwrite', s => s.clear())
}


function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(databaseName(), 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacén de fotos'))
  })
}
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('Fallo en el almacén de fotos'))
    })
  } finally { db.close() }
}

export async function listPhotos(): Promise<Photo[]> {
  const all = await run<Photo[]>('readonly', s => s.getAll())
  return all.sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at)
}
export async function savePhoto(photo: Photo): Promise<void> { await run('readwrite', s => s.put(photo)) }
export async function deletePhoto(id: string): Promise<void> { await run('readwrite', s => s.delete(id)) }

/** Reduce y endereza la foto. El lado largo queda en `max` px, JPEG calidad 0.82. */
export async function compress(file: Blob, max = 1280): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Sin lienzo para comprimir')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) throw new Error('No se pudo comprimir la foto')
  return { blob, w, h }
}
