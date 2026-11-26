import { useCallback, useEffect, useState } from 'react'
import type { AppData } from './lib/model'
import { relacion, type Dir, type Perfil, type Relacion } from './lib/perfil'
import { cancelarSolicitud, directorio, pedirAmistad, perfilDe, perfilesPublicos, solicitudes } from './lib/firebase'

export type Social = { dir: Dir[]; perfiles: Perfil[]; entrantes: string[]; salientes: string[] }
type Commit = (update: (d: AppData) => AppData) => void

let cache: { uid: string; at: number; data: Social } | null = null
let pending: { uid: string; p: Promise<Social> } | null = null

export function cargarSocial(uid: string, amigos: string[], force = false): Promise<Social> {
  if (!force && cache?.uid === uid && Date.now() - cache.at < 60000) return Promise.resolve(cache.data)
  if (pending?.uid === uid && !force) return pending.p
  const p = (async () => {
    const [dir, pub, sol] = await Promise.all([directorio(), perfilesPublicos(), solicitudes(uid)])
    const byDir = new Map(dir.map(d => [d.uid, d]))
    const byId = new Map(pub.map(x => [x.uid, x]))
    const privados = amigos.filter(id => !byId.has(id) && byDir.get(id)?.privada)
    ;(await Promise.all(privados.map(perfilDe))).forEach(x => { if (x) byId.set(x.uid, x) })
    const perfiles = [...byId.values()].filter(x => byDir.has(x.uid)).map(x => ({ ...x, siguiendo: byDir.get(x.uid)?.siguiendo ?? [] }))
    const data = { dir, perfiles, entrantes: sol.entrantes.filter(id => byDir.has(id)), salientes: sol.salientes }
    cache = { uid, at: Date.now(), data }
    return data
  })().finally(() => { pending = null })
  pending = { uid, p }
  return p
}

export function useSocial(uid: string | undefined, amigos: string[], enabled: boolean) {
  const [social, setSocial] = useState<Social | null>(() => cache && cache.uid === uid ? cache.data : null)
  const [failed, setFailed] = useState(false)
  const load = useCallback((force = false) => {
    if (!uid) return
    setFailed(false)
    cargarSocial(uid, amigos, force).then(setSocial).catch(() => setFailed(true))
  }, [uid, amigos.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) load() }, [enabled, load])
  return { social, failed, reload: () => load(true) }
}

export function relDe(uid: string, amigos: string[], d: Dir, social: Social | null, aceptados: string[] | null = null): Relacion {
  const otro = aceptados && !aceptados.includes(d.uid) ? { ...d, siguiendo: d.siguiendo.filter(id => id !== uid) } : d
  return relacion({ uid, siguiendo: amigos }, otro, { visible: !!social?.perfiles.some(p => p.uid === d.uid), pendiente: !!social?.salientes.includes(d.uid) })
}

export async function alternar(commit: Commit, uid: string, amigos: string[], d: Dir, social: Social | null): Promise<string> {
  const sigo = amigos.includes(d.uid)
  if (sigo) {
    commit(x => {
      const a = (x.settings.amigos ?? []).filter(id => id !== d.uid)
      const ap = (x.settings.aprobados ?? []).filter(id => id !== d.uid)
      return { ...x, settings: { ...x.settings, amigos: a.length ? a : undefined, aprobados: ap.length ? ap : undefined } }
    })
    if (social?.salientes.includes(d.uid)) await cancelarSolicitud(uid, d.uid).catch(() => undefined)
    return social?.salientes.includes(d.uid) ? `Cancelaste la solicitud a ${d.apodo}.` : `Quitaste a ${d.apodo}.`
  }
  commit(x => ({ ...x, settings: { ...x.settings, amigos: [...(x.settings.amigos ?? []), d.uid].slice(0, 200) } }))
  if (d.privada) { await pedirAmistad(uid, d.uid); return `Solicitud enviada a ${d.apodo}.` }
  return d.siguiendo.includes(uid) ? `¡Ya son amigos con ${d.apodo}!` : `Agregaste a ${d.apodo}.`
}

export async function responder(commit: Commit, uid: string, de: Dir, aceptar: boolean): Promise<string> {
  if (aceptar) commit(x => ({ ...x, settings: { ...x.settings, aprobados: [...new Set([...(x.settings.aprobados ?? []), de.uid])].slice(0, 500) } }))
  else commit(x => { const ap = (x.settings.aprobados ?? []).filter(id => id !== de.uid); return { ...x, settings: { ...x.settings, aprobados: ap.length ? ap : undefined } } })
  await cancelarSolicitud(de.uid, uid)
  return aceptar ? `Aceptaste a ${de.apodo}.` : `Rechazaste a ${de.apodo}.`
}
