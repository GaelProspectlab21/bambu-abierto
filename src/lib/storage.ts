import { EMPTY_DATA, normalizeData, type AppData } from './model'
import { newerState, type SyncState, type SyncStore } from './sync'

const DB_NAME = 'bambu-local'
const DB_VERSION = 1
const STORE_NAME = 'app'
let storageScope = 'signed-out'
const recordKey = () => `current:${storageScope}`
const currentKey = () => `bambu.app.v3.${storageScope}`
export function setStorageScope(scope: string): void { storageScope = scope }
const OWNER_KEY = 'cloud-owner'
const CURRENT_KEY = 'bambu.app.v2'
const LEGACY_KEY = 'ritmo.personal.v1'
const OWNER_LOCAL_KEY = 'bambu.cloud-owner.v1'
const LEGACY_OWNER_KEY = 'bambu.legacy-owner.v1'
export type StorageMode = 'indexeddb' | 'local'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
async function readDatabase(): Promise<unknown> {
  const key = recordKey()
  const db = await openDatabase()
  try { return await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)) } finally { db.close() }
}
async function writeDatabase(data: AppData): Promise<void> {
  const key = recordKey()
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(data, key)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { db.close() }
}
function readLocal(): AppData {
  const owner = localStorage.getItem(LEGACY_OWNER_KEY) ?? localStorage.getItem(OWNER_LOCAL_KEY) ?? 'local'
  const canAdoptLegacy = owner === storageScope
  const value = localStorage.getItem(currentKey()) ?? (canAdoptLegacy ? localStorage.getItem(CURRENT_KEY) ?? localStorage.getItem(LEGACY_KEY) : null)
  return value ? normalizeData(JSON.parse(value)) : EMPTY_DATA
}
export async function loadAppData(): Promise<{ data: AppData; mode: StorageMode }> {
  if (!localStorage.getItem(LEGACY_OWNER_KEY)) localStorage.setItem(LEGACY_OWNER_KEY, await getLocalOwnerId() ?? 'local')
  try {
    const saved = await readDatabase()
    if (saved) {
      const database = normalizeData(saved)
      const mirror = readLocal()
      return { data: (mirror.savedAt ?? 0) > (database.savedAt ?? 0) ? mirror : database, mode: 'indexeddb' }
    }
    let legacy = readLocal()
    // Only the recorded owner may adopt the old unscoped snapshot.
    const owner = localStorage.getItem(LEGACY_OWNER_KEY)
    if (owner === storageScope) {
      const db = await openDatabase()
      let old: unknown
      try { old = await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get('current')) } finally { db.close() }
      const mirror = localStorage.getItem(CURRENT_KEY) ?? localStorage.getItem(LEGACY_KEY)
      const oldLocal = mirror ? normalizeData(JSON.parse(mirror)) : EMPTY_DATA
      const oldDb = old ? normalizeData(old) : EMPTY_DATA
      legacy = (oldLocal.savedAt ?? 0) > (oldDb.savedAt ?? 0) ? oldLocal : oldDb
    }
    await writeDatabase(legacy)
    return { data: legacy, mode: 'indexeddb' }
  } catch (error) {
    console.warn('IndexedDB no está disponible; bambu usará almacenamiento local.', error)
    return { data: readLocal(), mode: 'local' }
  }
}
export async function readScope(scope: string): Promise<AppData | null> {
  let database: AppData | null = null
  let mirror: AppData | null = null
  try {
    const db = await openDatabase()
    try { const v = await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(`current:${scope}`)); if (v) database = normalizeData(v) } finally { db.close() }
  } catch { database = null }
  try { const raw = localStorage.getItem(`bambu.app.v3.${scope}`); if (raw) mirror = normalizeData(JSON.parse(raw)) } catch { mirror = null }
  if (!database || !mirror) return database ?? mirror
  return (mirror.savedAt ?? 0) > (database.savedAt ?? 0) ? mirror : database
}
export async function saveAppData(data: AppData): Promise<StorageMode> {
  const mirrorKey = currentKey()
  try { await writeDatabase(data) } catch (error) {
    console.warn('No se pudo escribir en IndexedDB; se guardará una copia local.', error)
    localStorage.setItem(mirrorKey, JSON.stringify(data))
    return 'local'
  }
  try { localStorage.setItem(mirrorKey, JSON.stringify(data)) } catch (error) {
    console.warn('IndexedDB guardó los datos, pero falló el espejo local.', error)
  }
  return 'indexeddb'
}

export async function getLocalOwnerId(): Promise<string | null> {
  try {
    const db = await openDatabase()
    try {
      const owner = await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(OWNER_KEY))
      if (typeof owner === 'string') return owner
    } finally { db.close() }
  } catch (error) {
    console.warn('No se pudo leer la cuenta vinculada en IndexedDB.', error)
  }
  try { return localStorage.getItem(OWNER_LOCAL_KEY) } catch (error) {
    console.error('No se pudo comprobar la cuenta de los datos locales.', error)
    throw new Error('No se pudo comprobar la cuenta vinculada a este dispositivo.')
  }
}

export async function setLocalOwnerId(ownerId: string): Promise<void> {
  let indexedDbSaved = false
  try {
    const db = await openDatabase()
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(ownerId, OWNER_KEY)
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
      indexedDbSaved = true
    } finally { db.close() }
  } catch (error) {
    console.warn('No se pudo guardar la cuenta vinculada en IndexedDB.', error)
  }
  try { localStorage.setItem(OWNER_LOCAL_KEY, ownerId) } catch (error) {
    if (!indexedDbSaved) {
      console.error('No se pudo guardar la cuenta vinculada a los datos locales.', error)
      throw new Error('No se pudo proteger el espacio local de esta cuenta.')
    }
  }
}
/** La cola de sincronización vive junto a los datos, separada por cuenta. */
export function syncStore(userId: string): SyncStore {
  const key = `sync:${userId}`
  const mirror = `bambu.sync.${userId}`
  // Las dos copias llevan savedAt y al leer gana la más nueva. Antes se leía IndexedDB primero
  // y, si un guardado había caído al espejo, la cola vieja escondía los cambios nuevos.
  return {
    async load() {
      let database: SyncState | null = null
      let local: SyncState | null = null
      try {
        const db = await openDatabase()
        try {
          const value = await requestValue(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key))
          if (value) database = value as SyncState
        } finally { db.close() }
      } catch (error) { console.warn('No se pudo leer la cola de sincronización en IndexedDB.', error) }
      try { const raw = localStorage.getItem(mirror); local = raw ? JSON.parse(raw) as SyncState : null } catch { local = null }
      return newerState(database, local)
    },
    async save(state) {
      const stamped: SyncState = { ...state, savedAt: Date.now() }
      let saved = false
      try {
        const db = await openDatabase()
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite')
          transaction.objectStore(STORE_NAME).put(stamped, key)
          await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error) })
          saved = true
        } finally { db.close() }
      } catch (error) { console.warn('IndexedDB no guardó la cola; queda el espejo local.', error) }
      try { localStorage.setItem(mirror, JSON.stringify(stamped)) } catch (error) {
        if (!saved) throw error
        console.warn('IndexedDB guardó la cola, pero falló el espejo local.', error)
      }
    },
  }
}

/** Pide al navegador que no borre los datos por falta de espacio (importante en iPhone). */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}

export function parseBackup(serialized: string): AppData {
  const value: unknown = JSON.parse(serialized)
  if (!value || typeof value !== 'object') throw new Error('El respaldo no es un objeto de bambu.')
  const backup = value as Partial<AppData>
  if (!Array.isArray(backup.reading) || !Array.isArray(backup.focus) || !backup.habits || typeof backup.habits !== 'object') {
    throw new Error('El respaldo no contiene las secciones esperadas de bambu.')
  }
  return normalizeData(backup)
}

/** Remove only this account's device copies after server deletion succeeds. */
export async function clearAccountStorage(userId: string): Promise<void> {
  const db = await openDatabase()
  try {
    const owner = await getLocalOwnerId()
    const ownsLegacy = localStorage.getItem(LEGACY_OWNER_KEY) === userId
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(`current:${userId}`)
    store.delete(`sync:${userId}`)
    if (ownsLegacy) store.delete('current')
    if (owner === userId) store.delete(OWNER_KEY)
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })
    localStorage.removeItem(`bambu.app.v3.${userId}`)
    localStorage.removeItem(`bambu.sync.${userId}`)
    if (ownsLegacy) { localStorage.removeItem(CURRENT_KEY); localStorage.removeItem(LEGACY_KEY); localStorage.removeItem('bambu-auth-log'); localStorage.setItem(LEGACY_OWNER_KEY, 'deleted') }
    if (owner === userId) localStorage.removeItem(OWNER_LOCAL_KEY)
    localStorage.removeItem(`bambu-auth-log:${userId}`)
  } finally { db.close() }
}

export async function wipeDevice(): Promise<void> {
  await new Promise<void>(resolve => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve()
    } catch { resolve() }
  })
  try {
    Object.keys(localStorage).filter(k => k.startsWith('bambu') || k.startsWith('ritmo')).forEach(k => localStorage.removeItem(k))
  } catch { return }
}
