import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from './AuthScreen'
import { NightPage } from './Night'
import { Companion } from './Companion'
import { Onboarding } from './Onboarding'
import { TodayPage, type Section } from './TodayPage'
import { ReadingPage, freshReading } from './ReadingPage'
import { TrainingPage } from './TrainingPage'
import type { Preset } from './FocusPage'
import { TasksHub, type HubTab } from './TasksHub'
import { HabitsPage } from './HabitsPage'
import { SettingsPage } from './SettingsPage'
import { HistoryPage } from './PersonalPages'
import { FoodPage } from './FoodPage'
import { PageVerse } from './PageExtras'
import { activeHabits, dateKey, EMPTY_DATA, modulesOf, normalizeData, type AppData } from './lib/model'
import { nfcServerAction } from './lib/nfcActions'
import { applyRecords, diffRecords, toRecords, type RecordRow } from './lib/records'
import { pullSince, pushRows, SyncEngine, type SyncStatus } from './lib/sync'
import { readCloudSnapshot } from './lib/cloudSync'
import { authStorageKey, cloudAvailable, cloudConfigured, supabase } from './lib/supabase'
import { flushAuthLog, logAuth, setAuthLogOwner } from './lib/authLog'
import { clearAccountStorage, getLocalOwnerId, setStorageScope, loadAppData, parseBackup, requestPersistence, saveAppData, setLocalOwnerId, syncStore } from './lib/storage'
import { clearOwnPhotos, setPhotoOwner } from './lib/photos'
import { clearNfcFromUrl, isRepeatScan, parseNfc, type NfcAction } from './lib/nfc'
import { NfcQuick } from './NfcQuick'
import type { PersonalTask } from './lib/personal'
import { game, rankOf } from './lib/gamification'
import { keptToday } from './lib/vara'
import { CelebrationLayer, celebrate } from './ui'
import { LoadingScreen, NotFound, ProblemScreen, Recovering, ScreenCrash } from './StatusScreens'
import { OfflineBanner, useOnline } from './Offline'
import { plural } from './lib/text'
import { Icon, type IconName } from './Icons'
import { QuickLog } from './QuickLog'
import { StretchHost } from './Stretch'
import { stretchSlot, type StretchWhen } from './lib/stretch'
import { realReading, streak } from './lib/progress'
import { votesOn } from './lib/identity'

const NAV: { id: Section; icon: IconName; mobile: boolean }[] = [
  { id: 'Hoy', icon: 'hoy', mobile: true }, { id: 'Lectura', icon: 'lectura', mobile: true }, { id: 'Entrenar', icon: 'entrenar', mobile: true },
  { id: 'Tareas', icon: 'tareas', mobile: true },
  { id: 'Comida', icon: 'comida', mobile: false }, { id: 'Noche', icon: 'noche', mobile: false }, { id: 'Hábitos', icon: 'habitos', mobile: false }, { id: 'Historial', icon: 'historial', mobile: false }, { id: 'Ajustes', icon: 'ajustes', mobile: false },
]
/** ?rescate=1 abre directo "en vez de scrollear" (Atajo de iOS, etiqueta o ícono). Se lee al cargar, antes de limpiar la URL. */
const BOOT_RESCUE = new URL(window.location.href).searchParams.has('rescate')
// ?estirar=noche (o =manana, o solo ?estirar para la que toque por la hora): una etiqueta NFC junto a la cama abre el estiramiento.
const BOOT_STRETCH: StretchWhen | null = (() => {
  const v = new URL(window.location.href).searchParams.get('estirar')
  if (v === null) return null
  const url = new URL(window.location.href); url.searchParams.delete('estirar'); window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  return v === 'noche' || v === 'manana' ? v : stretchSlot() ?? 'noche'
})()
/** ?ir=lectura abre esa sección (lo usan los avisos push). */
const IR: Record<string, Section> = { comida: 'Comida', noche: 'Noche', hoy: 'Hoy', lectura: 'Lectura', entrenar: 'Entrenar', enfoque: 'Enfoque', tareas: 'Tareas', ajustes: 'Ajustes' }
function sectionFromUrl(): Section {
  const url = new URL(window.location.href)
  const target = IR[url.searchParams.get('ir') ?? '']
  if (url.searchParams.has('ir')) { url.searchParams.delete('ir'); window.history.replaceState({}, '', url.pathname + url.search + url.hash) }
  return target ?? 'Hoy'
}
/** Una ruta que la app no conoce: /lo-que-sea o ?ir=algo-que-no-existe. Se lee ANTES de que sectionFromUrl limpie ?ir. */
function lostUrl(): boolean {
  const url = new URL(window.location.href)
  const ir = url.searchParams.get('ir')
  return !['/', '/index.html'].includes(url.pathname) || (ir !== null && !IR[ir])
}
/** tone 'error': el toast se ve de alerta; action: texto del botón (por defecto Deshacer). */
type ToastOptions = { tone?: 'error'; action?: string }
type Toast = { text: string; undo?: () => void; id: number } & ToastOptions

/** Súbelo cuando cambie cómo se limpian los registros (model.ts / records.ts): cada teléfono baja todo una vez. */
const DATA_VERSION = '2026-11-22-comida'
const DATA_VERSION_KEY = 'bambu.dataVersion'

/** La sesión que supabase-js dejó guardada en el teléfono, solo para saber de quién son los datos locales. */
function storedSession(): Session | null {
  try {
    const raw = JSON.parse(localStorage.getItem(authStorageKey) ?? 'null') as Session | null
    return raw?.user?.id ? raw : null
  } catch { return null }
}

/** Solo en desarrollo: ?crash=1 truena una vez (se repara sola), ?crash=2 truena siempre (tarjeta completa). */
let probeHits = 0
function CrashProbe() {
  if (!import.meta.env.DEV) return null
  const mode = new URLSearchParams(window.location.search).get('crash')
  if (mode === '2' || (mode === '1' && probeHits++ === 0)) throw new Error('Prueba de caída de pantalla')
  return null
}

/**
 * Si una pantalla truena, el primer intento se repara solo en un segundo (muchos fallos son de
 * un instante, como datos a medio llegar). Si vuelve a tronar, enseña la tarjeta completa.
 */
class Guard extends Component<{ children: ReactNode; onExport: () => void; onHome: () => void; where: string }, { error: Error | null; retried: boolean }> {
  state = { error: null as Error | null, retried: false }
  timer: number | null = null
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('Bambú encontró un error de pantalla.', error) }
  // El reintento se agenda al montar y al actualizar: si un desmontaje canceló el temporizador,
  // el siguiente montaje lo vuelve a poner y la pantalla nunca se queda en "Reacomodando".
  componentDidMount() { this.ensureRetry() }
  componentDidUpdate() { this.ensureRetry() }
  componentWillUnmount() { if (this.timer) window.clearTimeout(this.timer); this.timer = null }
  ensureRetry() {
    if (!this.state.error || this.state.retried || this.timer) return
    this.timer = window.setTimeout(() => { this.timer = null; this.setState({ error: null, retried: true }) }, 1100)
  }
  render() {
    if (!this.state.error) return this.props.children
    if (!this.state.retried) return <Recovering />
    return <ScreenCrash error={this.state.error} where={this.props.where} onRetry={() => this.setState({ error: null })} onExport={this.props.onExport} onHome={this.props.onHome} />
  }
}

export default function App() {
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const dataRef = useRef<AppData>(EMPTY_DATA)
  const [ready, setReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [authReady, setAuthReady] = useState(!cloudConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [recoveryMode, setRecoveryMode] = useState(() => /(?:type=recovery|type=invite)/.test(`${window.location.search}${window.location.hash}`))
  const [cloudReady, setCloudReady] = useState(!cloudConfigured)
  const [cloudError, setCloudError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const engine = useRef<SyncEngine | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  const [lost, setLost] = useState(lostUrl)
  const [section, setSection] = useState<Section>(sectionFromUrl)
  const [moreOpen, setMoreOpen] = useState(false)
  // ?registrar=1 (acceso directo del ícono, una etiqueta NFC o un Atajo de iOS) abre el registro en un toque.
  const [quickOpen, setQuickOpen] = useState(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('registrar') && !url.searchParams.has('rescate')) return false
    url.searchParams.delete('registrar'); url.searchParams.delete('rescate'); window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    return true
  })
  const quickRescue = BOOT_RESCUE
  // Primera vez en Hoy: Brote señala el botón + una sola vez (como el primer tip de cualquier app buena).
  const [plusTip, setPlusTip] = useState(() => { try { return localStorage.getItem('bambu.tip.plus') !== '1' } catch { return false } })
  const openQuick = useCallback(() => { setMoreOpen(false); setQuickOpen(true); setPlusTip(false); try { localStorage.setItem('bambu.tip.plus', '1') } catch { /* solo es el tip */ } }, [])
  const [toast, setToast] = useState<Toast | null>(null)
  const [nfc, setNfc] = useState<NfcAction | null>(() => parseNfc(window.location.search))
  // Etiqueta con llave abierta en Safari sin sesión: la acción la hace el servidor (NfcQuick).
  const [quick, setQuick] = useState(() => parseNfc(window.location.search) ? window.location.search : '')
  const [preset, setPreset] = useState<Preset | null>(null)
  const [hubTab, setHubTab] = useState<HubTab>('lista')
  const [trainingKey, setTrainingKey] = useState(0)

  const message = useCallback((text: string, undo?: () => void, options?: ToastOptions) => setToast({ text, undo, id: Date.now(), ...options }), [])
  const fail = useCallback((text: string, retry?: () => void) => message(text, retry, { tone: 'error', action: 'Reintentar' }), [message])
  const online = useOnline()
  const [update, setUpdate] = useState(false)

  // Red de seguridad: un error suelto (fuera de una pantalla) no debe pasar en silencio ni asustar.
  // Lo de red se ignora aquí porque la franja de sin señal ya lo explica. Máximo un aviso por minuto.
  useEffect(() => {
    let last = 0
    const shout = (reason: unknown) => {
      const text = reason instanceof Error ? reason.message : String(reason ?? '')
      if (/fetch|network|load failed|resizeobserver|abort|able to recover/i.test(text) || Date.now() - last < 60000) return
      last = Date.now()
      console.error('Error sin atrapar en Bambú.', reason)
      message('Algo falló por dentro. Lo que registraste está guardado; si se repite, recarga.', undefined, { tone: 'error' })
    }
    const onError = (e: ErrorEvent) => shout(e.error ?? e.message)
    const onRejection = (e: PromiseRejectionEvent) => shout(e.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [message])

  // Versión nueva: el service worker ya la instaló; la pantalla sigue con la vieja hasta recargar.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    const on = () => setUpdate(true)
    navigator.serviceWorker.addEventListener('controllerchange', on)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', on)
  }, [])
  const replace = useCallback((next: AppData) => { dataRef.current = next; setData(next) }, [])
  const applyRemote = useCallback((rows: RecordRow[]) => {
    const next = applyRecords(dataRef.current, rows)
    if (next !== dataRef.current) replace(next)
  }, [replace])
  /** Lo que baja la nube: a la pantalla y al disco YA, sin esperar el guardado diferido. El cursor espera esto. */
  const persistRemote = useCallback(async (rows: RecordRow[]) => {
    const next = applyRecords(dataRef.current, rows)
    if (next === dataRef.current) return
    replace(next)
    await saveAppData(next)
  }, [replace])

  /**
   * Una vez por versión de datos, el teléfono vuelve a bajar todo. Por qué: si un teléfono bajó
   * sus registros con una versión vieja de la app, esa versión pudo tirar campos al limpiarlos
   * (pasó con dayConfirmed: la racha salía en 3 en vez de 72). Como esos registros no vuelven a
   * cambiar en la nube, nunca se corregían solos. Primero sube lo pendiente para no pisarlo.
   */
  const refreshIfStale = useCallback(async (client: NonNullable<typeof supabase>, uid: string, sync: SyncEngine) => {
    let seen = ''
    try { seen = localStorage.getItem(DATA_VERSION_KEY) ?? '' } catch { return }
    if (seen === DATA_VERSION) return
    try {
      // Si la subida no se confirmó, no se baja nada: se reintenta en el próximo arranque.
      if (!await sync.syncNow()) return
      const all = await pullSince(client, uid, 0)
      await persistRemote(sync.keepNewer(all.rows))
      localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION)
      logAuth('data-refresh', { rows: all.rows.length, from: seen || 'none' })
    } catch (error) { console.warn('No se pudo refrescar el espacio; se intenta en el próximo arranque.', error) }
  }, [persistRemote])

  /** Única puerta de escritura: guarda, calcula qué registros cambiaron y los manda a la cola. */
  const commit = useCallback((update: (d: AppData) => AppData) => {
    const prev = dataRef.current
    const raw = update(prev)
    if (raw === prev) return
    const next = { ...raw, savedAt: Date.now() }
    replace(next)
    const rows = diffRecords(prev, next)
    if (!rows.length) return
    engine.current?.track(rows)
    channel.current?.postMessage(rows)
  }, [replace])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    if (cloudConfigured && (!session || !cloudReady)) return
    const bc = new BroadcastChannel(`bambu-records:${cloudConfigured ? session!.user.id : 'local'}`)
    bc.onmessage = (event: MessageEvent<RecordRow[]>) => { if (Array.isArray(event.data)) applyRemote(event.data) }
    channel.current = bc
    return () => { bc.close(); channel.current = null }
  }, [applyRemote, session?.user.id, cloudReady])

  useEffect(() => {
    let cancelled = false
    setStorageScope(cloudConfigured ? storedSession()?.user.id ?? 'signed-out' : 'local')
    void setPhotoOwner(cloudConfigured ? storedSession()?.user.id ?? 'signed-out' : 'local')
    loadAppData().then(({ data: saved }) => { if (!cancelled) { replace(saved); setReady(true) } })
      .catch(error => { console.error('No se pudo leer el espacio local de Bambú.', error); setLoadFailed(true) })
    void requestPersistence()
    return () => { cancelled = true }
  }, [replace])

  useEffect(() => {
    if (!ready || (cloudConfigured && (!session || !cloudReady))) return
    const timer = window.setTimeout(() => { saveAppData(data).catch(error => { console.error('No se pudo guardar localmente.', error); message('No se pudo guardar en este teléfono. Descarga un respaldo desde Ajustes.', undefined, { tone: 'error' }) }) }, 250)
    return () => window.clearTimeout(timer)
  }, [data, ready, message, session?.user.id, cloudReady])

  useEffect(() => {
    if (!cloudConfigured || !supabase) return
    let cancelled = false
    let stored = false
    try { stored = !!localStorage.getItem(authStorageKey) } catch { stored = false }
    setAuthLogOwner(storedSession()?.user.id ?? 'signed-out')
    logAuth('boot', { stored })
    const { data: auth } = supabase.auth.onAuthStateChange((event, next) => {
      setAuthLogOwner(next?.user.id ?? 'signed-out')
      if (event !== 'TOKEN_REFRESHED') logAuth(event, { session: !!next })
      if (cancelled) return
      if (event === 'SIGNED_OUT') { engine.current?.stop(); engine.current = null; setCloudReady(false); replace({ ...EMPTY_DATA }) }
      setSession(current => current?.user.id === next?.user.id ? current ?? next : next)
      setAuthReady(true)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    // Sin señal y con el token vencido, supabase-js espera a la red para renovarlo y la app se
    // quedaba en "Abriendo tu espacio". Si en 4 s no hay respuesta y el teléfono tiene una sesión
    // guardada, se abre con ella y con los datos locales; la nube se pone al día sola al volver la red.
    let resolved = false
    const offlineTimer = window.setTimeout(() => {
      if (cancelled || resolved) return
      const saved = storedSession()
      if (!saved) return
      logAuth('offline-boot', { stored })
      setSession(current => current ?? saved)
      setAuthReady(true)
    }, 4000)
    supabase.auth.getSession().then(({ data: current, error }) => {
      resolved = true
      logAuth('getSession', { stored, session: !!current.session, error: error?.message?.slice(0, 120) })
      if (cancelled) return
      // Un fallo de red no es una sesión cerrada: se conserva la guardada.
      const network = !!error && (error.name === 'AuthRetryableFetchError' || !navigator.onLine)
      setSession(current.session ?? (network ? storedSession() : null))
      setAuthReady(true)
    }).catch(error => { resolved = true; logAuth('getSession-throw', { stored, error: String(error).slice(0, 120) }); console.error('No se pudo recuperar la sesión.', error); if (!cancelled) { setSession(storedSession()); setAuthReady(true) } })
    return () => { cancelled = true; window.clearTimeout(offlineTimer); auth.subscription.unsubscribe() }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!cloudConfigured || !supabase || !userId || !ready) return
    const client = supabase
    let cancelled = false
    setCloudReady(false)
    setCloudError('')
    const sync = new SyncEngine({ client, userId, store: syncStore(userId), onRemote: persistRemote, onStatus: setStatus })
    async function hydrate() {
      try {
        setStorageScope(userId!)
        await setPhotoOwner(userId!)
        const own = await loadAppData()
        if (cancelled) return
        replace(own.data)
        const state = await sync.load()
        if (!state.bootstrapped) {
          const first = await pullSince(client, userId!, 0)
          let base: AppData
          if (first.rows.length) {
            base = applyRecords({ ...EMPTY_DATA }, first.rows)
          } else {
            const legacy = await readCloudSnapshot(userId!).catch(() => null)
            base = legacy ? normalizeData(legacy.data) : dataRef.current
            if (!legacy && !base.profile.onboardingComplete && typeof session?.user.user_metadata.display_name === 'string') {
              base = { ...base, profile: { ...base.profile, name: session.user.user_metadata.display_name.slice(0, 60) } }
            }
            await pushRows(client, toRecords(base))
          }
          const settled = first.rows.length ? first : await pullSince(client, userId!, 0)
          if (cancelled) return
          replace(base)
          await saveAppData(base)
          await sync.markBootstrapped(settled.cursor)
        }
        await setLocalOwnerId(userId!)
        if (cancelled) return
        engine.current = sync
        sync.start()
        setCloudReady(true)
        void flushAuthLog(client)
        void refreshIfStale(client, userId!, sync)
      } catch (error) {
        console.error('No se pudo abrir el espacio en la nube.', error)
        if (cancelled) return
        const owner = await getLocalOwnerId().catch(() => null)
        if (owner === userId && sync.bootstrapped) { engine.current = sync; sync.start(); setCloudReady(true) }
        else setCloudError(error instanceof Error ? error.message : 'Sin conexión')
      }
    }
    void hydrate()
    return () => { cancelled = true; sync.stop(); if (engine.current === sync) engine.current = null }
  }, [userId, ready, attempt, persistRemote, replace, refreshIfStale])

  const wasOffline = useRef(false)
  useEffect(() => {
    if (!online) { wasOffline.current = true; return }
    if (!wasOffline.current) return
    wasOffline.current = false
    const pending = status?.pending ?? 0
    message(pending ? `Volvió la señal. Subiendo tus ${pending} ${pending === 1 ? 'cambio' : 'cambios'}.` : 'Volvió la señal. Todo al día.')
    void engine.current?.syncNow()
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(t => t?.id === toast.id ? null : t), toast.tone === 'error' ? 8000 : toast.undo ? 6000 : 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Celebra lo que se gana: nivel, logros y día completo. La primera lectura solo memoriza.
  const seen = useRef<{ level: number; unlocked: Set<string>; dayComplete: boolean; kept: Set<string>; day: string; read: boolean; votes: number } | null>(null)
  useEffect(() => {
    if (!ready || !data.profile.onboardingComplete) return
    const timer = window.setTimeout(() => {
      const g = game(dataRef.current)
      const unlocked = new Set(g.achievements.filter(a => a.unlocked).map(a => a.id))
      const before = seen.current
      const day = dateKey()
      const kept = new Set(keptToday(dataRef.current, day))
      const rs = streak(dataRef.current.reading.filter(realReading).map(r => r.day), day)
      const votes = votesOn(dataRef.current, day).total
      seen.current = { level: g.level, unlocked, dayComplete: g.dayComplete, kept, day, read: rs.todayDone, votes }
      if (!before) return
      // La racha crece en el momento en que lees (el instante más adictivo de Duolingo, aquí ganado).
      if (before.day === day && !before.read && rs.todayDone && modulesOf(dataRef.current.settings).reading) celebrate({ kind: 'streak', title: rs.current === 1 ? 'Día uno.' : `${rs.current} días seguidos`, text: rs.current === 1 ? 'Toda racha larga empezó con un día como este.' : rs.current >= rs.best ? 'Tu mejor racha. Sigue mañana.' : `Tu récord es ${rs.best}. Vas por él.`, count: rs.current })
      // Promesa cumplida en el momento: la recompensa pegada a la acción, como en el pollito.
      if (before.day === day) {
        const promises = dataRef.current.checkins.find(c => c.day === day)?.promises ?? []
        const fresh = promises.filter(p => kept.has(p.id) && !before.kept.has(p.id))
        fresh.slice(0, 1).forEach(p => celebrate({ kind: 'record', title: 'Promesa cumplida', text: kept.size === promises.length ? `${p.label}. Cumpliste todo lo que prometiste hoy.` : `${p.label}. Te ${promises.length - kept.size === 1 ? 'falta una' : `faltan ${promises.length - kept.size}`}.` }))
      }
      if (g.level > before.level) {
        // Cambio de etapa: la celebración grande, con la imagen de la etapa nueva.
        const newRank = rankOf(g.level).index > rankOf(before.level).index
        celebrate(newRank
          ? { kind: 'rank', title: `Nueva etapa: ${g.rank}`, text: `Nivel ${g.level}. Lo que repetiste echó raíz.`, image: g.rankInfo.image }
          : { kind: 'level', title: `¡Nivel ${g.level}!`, text: g.rankInfo.next ? `${g.rankInfo.next.level - g.level} ${g.rankInfo.next.level - g.level === 1 ? 'nivel' : 'niveles'} para ${g.rankInfo.next.name}.` : `Tu bambú ya es ${g.rank}.` })
      }
      g.achievements.filter(a => a.unlocked && !before.unlocked.has(a.id)).slice(0, 2).forEach(a => celebrate({ kind: 'achievement', title: a.name, text: a.description }))
      if (g.dayComplete && !before.dayComplete) celebrate({ kind: 'day', title: 'Día completo', text: '5 de 5 misiones. +25 XP.' })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [data, ready])

  const go = useCallback((target: Section) => { const next: Section = target === 'Enfoque' ? 'Tareas' : target; if (target === 'Enfoque') setHubTab('bloque'); setSection(next); setLost(false); setMoreOpen(false); window.scrollTo({ top: 0 }) }, [])
  const goHome = useCallback(() => { window.history.replaceState({}, '', '/'); go('Hoy') }, [go])

  // ── NFC: se resuelve una sola vez, cuando ya están los datos de la cuenta ──
  const appReady = ready && (!cloudConfigured || (cloudReady && !!session)) && data.profile.onboardingComplete
  useEffect(() => {
    if (!nfc || !appReady) return
    const action = nfc
    setNfc(null)
    clearNfcFromUrl()
    if (isRepeatScan(action)) return
    const d = dataRef.current
    const now = Date.now()
    if (action.tag === 'reading') {
      const s = d.activeReading
      if (s && !s.endedAt) {
        if (now - s.startedAt < 8000) { message('Tu lectura ya empezó.'); go('Lectura'); return }
        commit(x => nfcServerAction(x, { tag: 'reading' }, Date.now(), dateKey()).next)
        message('Tiempo de lectura guardado. Completa tus capítulos y tu idea.')
      } else if (!s) {
        commit(x => x.activeReading ? x : ({ ...x, activeReading: freshReading() }))
        message('Lectura iniciada. Vuelve a acercar el teléfono al terminar.', () => commit(x => ({ ...x, activeReading: null })))
      }
      go('Lectura')
    } else if (action.tag === 'training') {
      const w = d.activeWorkout
      if (w && !w.endedAt && now - w.startedAt > 8000) {
        const sets = d.sets.filter(s => s.day === dateKey()).length
        commit(x => ({ ...x, activeWorkout: null }))
        message(`Sesión cerrada: ${plural(sets, 'serie', 'series')} en ${Math.round((now - w.startedAt) / 60000)} min. Come proteína y duerme tus horas.`)
      } else if (!w || w.endedAt) {
        commit(x => ({ ...x, activeWorkout: { startedAt: now } }))
        message('Sesión iniciada. Registra cada serie al terminarla.', () => commit(x => ({ ...x, activeWorkout: null })))
      }
      setTrainingKey(k => k + 1)
      go('Entrenar')
    } else if (action.tag === 'focus') {
      const f = d.activeFocus
      if (f && f.phase !== 'ritual' && !f.endedAt && now - f.startedAt > 8000) {
        commit(x => ({ ...x, activeFocus: x.activeFocus ? { ...x.activeFocus, endedAt: Date.now(), phase: 'closing' } : null }))
        message('Bloque detenido. Cierra con lo que lograste.')
      } else if (!f) {
        const next = d.tasks.filter((t: PersonalTask) => t.status === 'pending' || t.status === 'in_progress').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (b.level ?? 0) - (a.level ?? 0))[0]
        if (next) setPreset({ task: next.text, taskId: next.id, minutes: next.minutes, level: next.level })
      }
      go('Enfoque')
    } else if (action.tag === 'habit') {
      const habit = activeHabits(d.settings).find(h => h.id === action.habit)
      if (!habit) { message('Esa etiqueta apunta a un hábito que ya no existe.'); return }
      const day = dateKey()
      if ((d.habits[day] ?? []).includes(habit.id)) message(`${habit.label}: ya estaba marcado hoy.`)
      else {
        commit(x => ({ ...x, habits: { ...x.habits, [day]: [...(x.habits[day] ?? []), habit.id] } }))
        message(`Hecho: ${habit.label}.`, () => commit(x => ({ ...x, habits: { ...x.habits, [day]: (x.habits[day] ?? []).filter(id => id !== habit.id) } })))
      }
      go('Hoy')
    } else if (action.tag === 'night') {
      go('Noche')
    } else if (action.tag === 'checkin') {
      message(d.checkins.some(c => c.day === dateKey()) ? 'Ya hiciste tu check-in de hoy.' : 'Buenos días. ¿Cómo dormiste?')
      go('Hoy')
    } else if (action.tag === 'weigh') {
      message('Pésate en ayunas y guárdalo en Progreso.')
      setTrainingKey(k => k + 1)
      go('Entrenar')
    }
  }, [nfc, appReady, commit, go, message])

  function exportBackup() {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' }))
    link.download = `bambu-respaldo-${dateKey()}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    message('Respaldo descargado.')
  }
  async function importBackup(file?: File) {
    if (!file) return
    try {
      const restored = parseBackup(await file.text())
      if (!window.confirm('Esto reemplaza lo que hay en Bambú por el respaldo. ¿Continuar?')) return
      commit(() => restored)
      message('Respaldo restaurado.')
    } catch (error) {
      console.error('Respaldo inválido.', error)
      message('Ese archivo no parece un respaldo de Bambú. No se cambió nada.', undefined, { tone: 'error' })
    }
  }
  async function resync() {
    if (!supabase || !userId) return
    try {
      const all = await pullSince(supabase, userId, 0)
      replace(applyRecords({ ...EMPTY_DATA }, all.rows))
      await engine.current?.markBootstrapped(all.cursor)
      message(`Listo: ${plural(all.rows.length, 'registro', 'registros')} bajados de la nube.`)
    } catch (error) { console.error(error); fail('No se pudo bajar. Revisa tu conexión.', () => void resync()) }
  }
  async function deleteAccount() {
    if (!supabase || !userId) throw new Error('Sin cuenta')
    const { error } = await supabase.functions.invoke('bambu-account', { body: { action: 'delete', confirmation: 'BORRAR' } })
    if (error) throw error
    engine.current?.stop(); engine.current = null
    setReady(false)
    await supabase.auth.signOut({ scope: 'local' })
    const cleanup = await Promise.allSettled([clearOwnPhotos(), clearAccountStorage(userId)])
    if (cleanup.some(result => result.status === 'rejected')) {
      window.alert('Tu cuenta ya se borró de la nube. Este navegador no dejó borrar todas sus copias locales. Borra los datos de bambú en los ajustes del navegador para terminar.')
    }
    localStorage.removeItem(authStorageKey)
    window.location.reload()
  }
  async function signOut() {
    if (!supabase) return
    try { if (engine.current && !await engine.current.syncNow()) { fail('Hay cambios sin subir. Conéctate antes de cerrar sesión.'); return }; const { error } = await supabase.auth.signOut(); if (error) throw error } catch (error) { console.error(error); fail('No se pudo cerrar la sesión. Revisa tu conexión.', () => void signOut()) }
  }

  if (import.meta.env.PROD && !cloudAvailable) return <ProblemScreen tone="error" title="Falta conectar el espacio seguro." text="Esta versión se publicó sin su conexión a la nube y no abre datos locales. Hay que volver a publicarla." />
  if (loadFailed) return <ProblemScreen tone="error" title="No pudimos abrir tus datos." text="No los vamos a reemplazar por una lista vacía. Siguen guardados en este teléfono."><button className="primary-button" onClick={() => window.location.reload()}>Intentar otra vez</button></ProblemScreen>
  if (!ready || (cloudConfigured && !authReady)) return <LoadingScreen text="Abriendo tu espacio." />
  if (cloudConfigured && recoveryMode) return <AuthScreen recovery onRecoveryComplete={() => { window.history.replaceState({}, '', window.location.pathname + window.location.search); setRecoveryMode(false); message('Contraseña actualizada.') }} />
  if (cloudConfigured && !session && quick) return <NfcQuick search={quick} onSignIn={() => { setQuick(''); setNfc(null) }} />
  if (cloudConfigured && !session) return <AuthScreen recovery={false} onRecoveryComplete={() => setRecoveryMode(false)} />
  if (cloudConfigured && !cloudReady && cloudError) return <ProblemScreen tone="offline" title="No llegamos a la nube." text="Revisa tu señal. Lo de este teléfono sigue intacto y se sube solo cuando vuelva la conexión."><button className="primary-button" onClick={() => setAttempt(a => a + 1)}>Reintentar</button><button className="quiet-button" onClick={signOut}>Cerrar sesión</button></ProblemScreen>
  if (cloudConfigured && !cloudReady) return <LoadingScreen text="Sincronizando tu espacio privado." />
  if (!data.profile.onboardingComplete) return <Onboarding initialName={data.profile.name} onComplete={r => commit(d => ({ ...d, profile: { name: r.name || 'Tú', onboardingComplete: true, north: r.north || undefined },
    settings: { ...d.settings, modules: r.modules, habits: r.habits, age: r.age, footballDays: r.footballDays, ...(r.weeklyFocusGoal ? { weeklyFocusGoal: r.weeklyFocusGoal } : {}), ...(r.trainingLevel ? { trainingLevel: r.trainingLevel } : {}), ...(r.equipment ? { equipment: r.equipment } : {}) },
    habits: r.firstVotes.length ? { ...d.habits, [dateKey()]: [...new Set([...(d.habits[dateKey()] ?? []), ...r.firstVotes])] } : d.habits }))} />

  const syncText = !cloudConfigured ? 'Guardado en este dispositivo' : !status ? 'Conectando' : status.phase === 'synced' ? 'Nube al día' : status.phase === 'offline' ? `Sin conexión · ${status.pending} por subir` : `Subiendo ${status.pending || ''}`.trim()
  // Sin conexión con cambios pendientes: la píldora se vuelve botón para reintentar a mano.
  const retrySync = () => { const e = engine.current; if (!e) return; message('Reintentando subir tus cambios.'); void e.syncNow().then(okay => { if (!okay) fail('Sigue sin conexión. Tus cambios esperan en este teléfono.', retrySync) }) }
  const pill = (extra = '') => status?.phase === 'offline'
    ? <button type="button" className={`sync-pill sync-offline ${extra}`} onClick={retrySync} aria-label={`${syncText}. Toca para reintentar.`}>{syncText} · Reintentar</button>
    : <div className={`sync-pill sync-${status?.phase ?? 'local'} ${extra}`} role="status">{syncText}</div>
  // Cada persona usa lo suyo: lo que apagó en sus módulos no aparece.
  const mods = modulesOf(data.settings)
  const allowed = (id: Section) => id === 'Lectura' ? mods.reading : id === 'Entrenar' ? mods.training : id === 'Tareas' ? mods.focus : id === 'Comida' ? mods.food : true
  const nav = NAV.filter(n => allowed(n.id))
  const mobileCount = nav.filter(n => n.mobile).length
  const moreOnTop = mobileCount % 2 === 0
  const moreActive = moreOpen || ['Comida', 'Noche', 'Hábitos', 'Historial', 'Ajustes'].includes(section)
  const moreButton = (where: 'nav' | 'top') => <button key="more" type="button" className={`${where === 'top' ? 'top-more' : ''} ${moreActive ? 'on' : ''}`.trim()} aria-expanded={moreOpen} aria-label="Más secciones" onClick={() => setMoreOpen(!moreOpen)}><Icon name="mas" size={24} />{where === 'nav' && <span>Más</span>}</button>
  const live = { Lectura: !!data.activeReading, Tareas: !!data.activeFocus, Entrenar: !!(data.activeWorkout && !data.activeWorkout.endedAt) } as Partial<Record<Section, boolean>>
  return <div className="shell">
    <aside className="side">
      <button className="brand" onClick={() => go('Hoy')}><img className="brand-mark" src="/icon.svg" alt="" /><span>bambú</span></button>
      <nav className="side-nav" aria-label="Secciones">{nav.map(n => <button key={n.id} className={section === n.id ? 'side-item on' : 'side-item'} aria-current={section === n.id ? 'page' : undefined} onClick={() => go(n.id)}><Icon name={n.icon} size={20} />{n.id}{live[n.id] && <i className="live-dot" aria-label="en curso" />}</button>)}</nav>
      <button type="button" className="side-quick" onClick={openQuick}><Icon name="mas-grande" size={20} />Registrar</button>
      {pill()}
    </aside>
    <main className="main">
      <header className="top"><span className="crumb"><img className="crumb-mark" src="/icon.svg" alt="" /><b>bambú</b><span className="crumb-sec">› {lost ? 'No encontrada' : section}</span></span><span className="top-right">{pill()}{moreOnTop && moreButton('top')}</span></header>
      <div className="page">
        {!online && <OfflineBanner pending={status?.pending ?? 0} cloud={cloudConfigured} />}
        {update && <button type="button" className="update-banner" onClick={() => window.location.reload()}><span><strong>Versión nueva lista.</strong> Toca para estrenarla.</span><i aria-hidden="true">↻</i></button>}
        {lost ? <NotFound onHome={goHome} onGo={s => go(s)} /> : !allowed(section) ? <Guard onExport={exportBackup} onHome={goHome} where="Hoy" key="Hoy"><TodayPage data={data} commit={commit} go={go} onMessage={message} /></Guard> : <Guard onExport={exportBackup} onHome={goHome} where={section} key={section}><div className="section-in">
          <CrashProbe />
          {section === 'Hoy' && <TodayPage data={data} commit={commit} go={go} onMessage={message} />}
          {section === 'Lectura' && <ReadingPage data={data} commit={commit} onMessage={message} />}
          {section === 'Entrenar' && <TrainingPage key={trainingKey} data={data} commit={commit} onMessage={message} />}
          {section === 'Tareas' && <TasksHub data={data} commit={commit} onMessage={message} tab={hubTab} setTab={setHubTab} preset={preset} setPreset={setPreset} />}
          {section === 'Comida' && <FoodPage data={data} commit={commit} onMessage={message} />}
          {section === 'Noche' && <NightPage data={data} commit={commit} onMessage={message} go={go} />}
          {section === 'Hábitos' && <HabitsPage data={data} commit={commit} />}
          {section === 'Historial' && <HistoryPage data={data} go={s => go(s as Section)} />}
          {section === 'Ajustes' && <SettingsPage data={data} commit={commit} onMessage={message} status={status} cloud={cloudConfigured} onExport={exportBackup} onImport={f => void importBackup(f)} onResync={() => void resync()} onSignOut={() => void signOut()} onDeleteAccount={deleteAccount} />}
        </div></Guard>}
        {!lost && <PageVerse page={section} data={data} />}
        <footer className="foot">Lo que repites echa raíces.</footer>
      </div>
    </main>
    <nav className="bottom-nav" aria-label="Secciones principales">
      {(() => {
        // Simetría: el + siempre en el centro exacto, con el mismo número de botones a cada lado.
        // Si "Más" rompería el par, sube a la esquina de arriba (como el perfil en Duolingo).
        const items = nav.filter(n => n.mobile).map(n => <button key={n.id} className={section === n.id ? 'on' : ''} aria-current={section === n.id ? 'page' : undefined} onClick={() => go(n.id)}><Icon name={n.icon} size={24} /><span>{n.id}</span>{live[n.id] && <i className="live-dot" />}</button>)
        if (!moreOnTop) items.push(moreButton('nav'))
        const plus = <button key="plus" type="button" className="nav-plus" aria-label="Registrar en un toque" aria-expanded={quickOpen} onClick={openQuick}><span className="plus-disc"><Icon name="mas-grande" size={28} /></span></button>
        const half = items.length / 2
        return [...items.slice(0, half), plus, ...items.slice(half)]
      })()}
    </nav>
    {moreOpen && <div className={`more-sheet ${moreOnTop ? 'from-top' : ''}`} role="menu">{nav.filter(n => !n.mobile).map(n => <button key={n.id} role="menuitem" onClick={() => go(n.id)}><Icon name={n.icon} size={22} />{n.id}</button>)}</div>}
    {plusTip && !quickOpen && section === 'Hoy' && <button type="button" className="plus-tip" onClick={openQuick}><strong>Todo se registra aquí.</strong><span>Un toque y cuenta. Pruébalo.</span></button>}
    {quickOpen && <QuickLog data={data} commit={commit} onClose={() => setQuickOpen(false)} go={go} onMessage={message} startRescue={quickRescue} />}
    {!lost && <Companion data={data} section={section} go={s => go(s as Section)} commit={commit} now={Date.now()} cloud={cloudConfigured} />}
    <StretchHost data={data} commit={commit} onMessage={message} boot={BOOT_STRETCH} />
    <CelebrationLayer />
    {toast && <div key={toast.id} className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'}>{toast.tone === 'error' && <i aria-hidden="true">!</i>}<span>{toast.text}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null) }}>{toast.action ?? 'Deshacer'}</button>}</div>}
  </div>
}
