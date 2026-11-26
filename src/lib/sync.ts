/**
 * Motor de sincronización de Bambú v3.
 *
 * Analogía: un cartero con una mochila. Cada cambio que haces va a la mochila (pending) y
 * la mochila se guarda en el teléfono, así que si cierras la app o te quedas sin señal el
 * cambio no se pierde. Cuando hay red, el cartero entrega la mochila en lotes (push) y
 * recoge las cartas nuevas desde la última vez que pasó (pull con cursor). Si una carta
 * que llega es más vieja que algo que tú tienes en la mochila, gana lo tuyo.
 */
import { recordKey, type RecordRow } from './records'

export type SyncState = { cursor: number; pending: Record<string, RecordRow>; bootstrapped: boolean; savedAt?: number }
export type SyncStatus = { phase: 'loading' | 'syncing' | 'synced' | 'offline'; pending: number; lastSyncAt: number | null; error?: string }
export type SyncStore = { load: () => Promise<SyncState | null>; save: (state: SyncState) => Promise<void> }
export type Remote = { pull: (cursor: number) => Promise<{ rows: RecordRow[]; cursor: number }>; push: (rows: RecordRow[]) => Promise<void> }

export class UpdateRequired extends Error {}

export function newerState(a: SyncState | null, b: SyncState | null): SyncState | null {
  if (!a || !b) return a ?? b
  return (b.savedAt ?? 0) > (a.savedAt ?? 0) ? b : a
}

type Options = {
  client: Remote; userId: string; store: SyncStore
  /** Mete lo que llegó de la nube en los datos y lo GUARDA en el teléfono. El cursor avanza solo cuando esto termina. */
  onRemote: (rows: RecordRow[]) => void | Promise<void>
  onStatus: (status: SyncStatus) => void
}

export class SyncEngine {
  private state: SyncState = { cursor: 0, pending: {}, bootstrapped: false }
  private pushTimer: number | undefined
  private pollTimer: number | undefined
  private running: Promise<boolean> | null = null
  private again = false
  private failures = 0
  private stopped = false
  private lastSyncAt: number | null = null
  private error: string | undefined
  private readonly opts: Options
  constructor(opts: Options) { this.opts = opts }

  get bootstrapped() { return this.state.bootstrapped }

  async load(): Promise<SyncState> {
    this.state = (await this.opts.store.load()) ?? { cursor: 0, pending: {}, bootstrapped: false }
    return this.state
  }

  /** Primera vez en este dispositivo: deja el cursor listo después de la carga completa. */
  async markBootstrapped(cursor: number) {
    this.state = { ...this.state, cursor, bootstrapped: true }
    await this.persist()
  }

  track(rows: RecordRow[]) {
    if (!rows.length) return
    const pending = { ...this.state.pending }
    rows.forEach(row => { pending[recordKey(row.collection, row.id)] = row })
    this.state = { ...this.state, pending }
    void this.persist()
    this.emit('syncing')
    this.schedulePush(900)
  }

  start() {
    this.stopped = false
    const onWake = () => { if (!document.hidden) void this.sync() }
    const onHide = () => { if (document.hidden) void this.sync() }
    window.addEventListener('online', onWake)
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onHide)
    document.addEventListener('visibilitychange', onWake)
    this.pollTimer = window.setInterval(() => { if (!document.hidden) void this.sync() }, 20000)
    this.cleanup = () => {
      window.removeEventListener('online', onWake)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onHide)
      document.removeEventListener('visibilitychange', onWake)
    }
    void this.sync()
  }

  private cleanup = () => {}

  stop() {
    this.stopped = true
    window.clearTimeout(this.pushTimer)
    window.clearInterval(this.pollTimer)
    this.cleanup()
  }

  pendingCount() { return Object.keys(this.state.pending).length }

  /** Lo que llegó de la nube menos lo que este teléfono todavía tiene más nuevo en la mochila. */
  keepNewer(rows: RecordRow[]): RecordRow[] {
    return rows.filter(row => {
      const mine = this.state.pending[recordKey(row.collection, row.id)]
      return !mine || mine.clientUpdatedAt <= row.clientUpdatedAt
    })
  }

  /**
   * Empuja lo pendiente y jala lo nuevo. Nunca corre dos veces a la vez: si ya va una vuelta,
   * devuelve esa misma. Resuelve true solo si la vuelta terminó entera (subida y bajada).
   */
  async sync(): Promise<boolean> {
    if (this.stopped) return false
    if (this.running) { this.again = true; return this.running }
    const run = this.runOnce()
    this.running = run
    const done = await run
    this.running = null
    if (this.again && !this.stopped) { this.again = false; void this.sync() }
    else if (this.pendingCount() && !this.stopped && this.failures === 0) this.schedulePush(400)
    return done
  }

  /** Espera la vuelta que esté en curso y hace una completa propia. Para quien necesita saber que lo pendiente ya subió. */
  async syncNow(): Promise<boolean> {
    while (this.running) await this.running
    return this.sync()
  }

  private async runOnce(): Promise<boolean> {
    this.emit('syncing')
    try {
      const sending = Object.values(this.state.pending)
      if (sending.length) {
        await this.opts.client.push(sending)
        const pending = { ...this.state.pending }
        sending.forEach(row => {
          const key = recordKey(row.collection, row.id)
          if (pending[key]?.clientUpdatedAt === row.clientUpdatedAt) delete pending[key]
        })
        this.state = { ...this.state, pending }
      }
      const { rows, cursor } = await this.opts.client.pull(this.state.cursor)
      const fresh = this.keepNewer(rows)
      // Primero los datos al disco, después el cursor. Al revés, un cierre a la mitad dejaba
      // un cursor que ya no vuelve a pedir filas que nunca llegaron a guardarse.
      if (fresh.length) await this.opts.onRemote(fresh)
      this.state = { ...this.state, cursor }
      await this.persist()
      this.failures = 0
      this.error = undefined
      this.lastSyncAt = Date.now()
      this.emit(this.pendingCount() ? 'syncing' : 'synced')
      return true
    } catch (error) {
      this.failures++
      this.error = error instanceof Error ? error.message : String(error)
      console.warn('Bambú no pudo sincronizar; los cambios siguen en el dispositivo.', error)
      this.emit('offline')
      if (error instanceof UpdateRequired) { this.stop(); return false }
      this.schedulePush(Math.min(60000, 2000 * 2 ** Math.min(this.failures, 5)))
      return false
    }
  }

  private schedulePush(delay: number) {
    window.clearTimeout(this.pushTimer)
    this.pushTimer = window.setTimeout(() => void this.sync(), delay)
  }

  private async persist() {
    try { await this.opts.store.save(this.state) } catch (error) { console.error('No se pudo guardar la cola de sincronización.', error) }
  }

  private emit(phase: SyncStatus['phase']) {
    this.opts.onStatus({ phase, pending: this.pendingCount(), lastSyncAt: this.lastSyncAt, error: this.error })
  }
}
