import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { compress, deletePhoto, listPhotos, savePhoto, type Photo, type Pose } from './lib/photos'
import { photoSummary } from './lib/photoSummary'
import { dateKey, makeId, type AppData } from './lib/model'
import { haptic } from './lib/haptic'
import { Card, Chips, Empty, fmtDay } from './ui'

type Commit = (update: (d: AppData) => AppData) => void
const POSES: [Pose, string][] = [['frente', 'Frente'], ['lado', 'Lado'], ['espalda', 'Espalda']]

/** Antes y después en una sola imagen: arrastra el control para destapar la foto de arriba. */
function Reveal({ before, after }: { before: string; after: string }) {
  const [pct, setPct] = useState(50)
  return <div className="reveal">
    <div className="reveal-stage">
      <img src={after} alt="Foto más reciente" />
      <img src={before} alt="Foto más antigua" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} />
      <i className="reveal-line" style={{ left: `${pct}%` }} aria-hidden="true" />
    </div>
    <input type="range" min="0" max="100" value={pct} aria-label="Deslizar entre la foto antigua y la reciente" onChange={e => setPct(Number(e.target.value))} />
  </div>
}

export function PhotoLab({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: (t: string, undo?: () => void) => void }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [pose, setPose] = useState<Pose>('frente')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const urls = useRef(new Map<string, string>())
  const input = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try { setPhotos(await listPhotos()) } catch { setPhotos([]); setError('Este navegador no deja guardar fotos aquí.') }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => () => { urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current.clear() }, [])
  const url = (p: Photo) => {
    let u = urls.current.get(p.id)
    if (!u) { u = URL.createObjectURL(p.blob); urls.current.set(p.id, u) }
    return u
  }

  async function add(file: File | undefined) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const { blob, w, h } = await compress(file)
      const day = dateKey()
      await savePhoto({ id: makeId(), day, pose, blob, w, h, at: Date.now() })
      commit(d => ({ ...d, body: d.body.some(b => b.day === day) ? d.body.map(b => b.day === day ? { ...b, photos: true } : b) : [...d.body, { id: day, day, photos: true }] }))
      haptic()
      onMessage('Foto guardada en este teléfono.')
      await refresh()
    } catch { setError('No se pudo guardar la foto. Prueba con otra.') } finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  const ofPose = useMemo(() => (photos ?? []).filter(p => p.pose === pose), [photos, pose])
  const [fromId, setFromId] = useState<string | null>(null)
  const oldest = ofPose[ofPose.length - 1], newest = ofPose[0]
  const before = ofPose.find(p => p.id === fromId) ?? oldest
  const after = newest
  const sel = (photos ?? []).find(p => p.id === open) ?? null

  async function share(list: Photo[]) {
    const files = list.map(p => new File([p.blob], `bambu-${p.day}-${p.pose}.jpg`, { type: 'image/jpeg' }))
    const text = 'Claudio, revisa mis fotos de progreso. Dime de postura, constancia y qué ajustar en mi entreno. Sin opinar de mi cuerpo.'
    try {
      if (navigator.canShare?.({ files })) await navigator.share({ files, text })
      else onMessage('Este navegador no comparte archivos. Guarda las fotos y mándalas por el chat.')
    } catch { /* cancelado por ti */ }
  }

  return <Card className="photo-lab">
    <span className="eyebrow">FOTOS DE PROGRESO</span>
    <h2>Tu antes y después</h2>
    <p className="hint">Una vez al mes, mañana al levantarte y con la misma luz. Con ropa deportiva ajustada basta. Se quedan en este teléfono: no suben a ninguna nube.</p>
    <Chips label="Pose" value={pose} onChange={setPose} options={POSES} />
    <input ref={input} className="visually-hidden" type="file" accept="image/*" aria-label="Elegir o tomar foto" onChange={e => void add(e.target.files?.[0])} />
    <button className="primary-button" disabled={busy} aria-busy={busy} onClick={() => input.current?.click()}>{busy ? 'Guardando' : `Tomar foto de ${POSES.find(p => p[0] === pose)![1].toLowerCase()}`} <span>＋</span></button>
    {error && <p role="alert" className="hint">{error}</p>}
    {photos === null ? <p className="hint">Cargando fotos.</p>
      : ofPose.length === 0 ? <Empty>Aún no hay fotos de {pose}. Tu primera foto es el punto de partida.</Empty>
        : <>
          <div className="photo-grid">{ofPose.map(p => <button key={p.id} className={`photo-thumb ${p.id === open ? 'on' : ''}`} onClick={() => setOpen(p.id === open ? null : p.id)} aria-label={`Foto de ${p.pose} del ${fmtDay(p.day)}`}><img src={url(p)} alt="" loading="lazy" /><small>{fmtDay(p.day)}</small></button>)}</div>
          {sel && <div className="photo-open">
            <img src={url(sel)} alt={`Foto de ${sel.pose} del ${fmtDay(sel.day)}`} />
            <label>Notas o feedback de esta foto<textarea className="text-input" rows={3} maxLength={500} defaultValue={sel.note ?? ''} onBlur={async e => { if ((e.target.value || undefined) !== sel.note) { await savePhoto({ ...sel, note: e.target.value || undefined }); await refresh() } }} /></label>
            <div className="row-actions">
              <button className="secondary-button" onClick={() => void share([sel])}>Pedir feedback a Claudio</button>
              <button className="quiet-button" onClick={async () => { await deletePhoto(sel.id); setOpen(null); await refresh(); onMessage('Foto borrada.') }}>Borrar</button>
            </div>
          </div>}
          {ofPose.length >= 2 && before && after && before.id !== after.id && <div className="photo-compare">
            <h3>Antes y después</h3>
            <label className="photo-from">Desde<select className="text-input" value={before.id} onChange={e => setFromId(e.target.value)}>{ofPose.slice(1).map(p => <option key={p.id} value={p.id}>{fmtDay(p.day)}</option>)}</select></label>
            <Reveal before={url(before)} after={url(after)} />
            <div className="tallo-note"><img src="img/tallo-guapo.png" alt="" width="56" height="56" loading="lazy" /><div>
              <strong>Lo que dicen tus datos</strong>
              {photoSummary(data, before.day, after.day).lines.map(l => <p key={l}>{l}</p>)}
            </div></div>
            <button className="secondary-button" onClick={() => void share([before, after])}>Mandar las dos a Claudio</button>
          </div>}
        </>}
  </Card>
}
