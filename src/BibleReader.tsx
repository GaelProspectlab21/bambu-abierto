import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { dateKey, makeId, type AppData, type Reading } from './lib/model'
import { addVerseMark, lectioOf, parseVerses, verseLabel } from './lib/verses'
import { reward } from './juice'
import { addChapterMarks, book, nextAfter } from './lib/bible'
import { Card, celebrate, fmtDay } from './ui'
import { BroteArt } from './Brote'
import { plural } from './lib/text'

type Commit = (update: (d: AppData) => AppData) => void
type Verse = [number, string]
type BookText = { id: number; capitulos: Verse[][] }

/**
 * La Biblia dentro de bambú. Biblia libre Latinoamericana (dominio público, eBible.org).
 * Cada libro es un JSON en /biblia/bll/. "Guardar para el viaje" los mete a una caché propia
 * (sin el prefijo bambu-, así una versión nueva de la app no la borra) y se lee en modo avión.
 */
export const BIBLE_CACHE = 'biblia-bll-v1'
const url = (id: number) => `biblia/bll/${id}.json`
const POS_KEY = 'bambu.biblia.pos'
const SIZE_KEY = 'bambu.biblia.letra'
const memo = new Map<number, BookText>()

async function loadBook(id: number): Promise<BookText> {
  const hit = memo.get(id)
  if (hit) return hit
  let res: Response | undefined
  try { res = await fetch(url(id)) } catch { res = undefined }
  if (!res?.ok && 'caches' in window) res = await caches.match(url(id))
  if (!res?.ok) throw new Error('sin-texto')
  const text = await res.json() as BookText
  memo.set(id, text)
  return text
}

function readPos(): { book: number; chapter: number } | null {
  try { const v = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { book: number; chapter: number } | null; return v && book(v.book) ? v : null } catch { return null }
}
function savePos(pos: { book: number; chapter: number }) { try { localStorage.setItem(POS_KEY, JSON.stringify(pos)) } catch { /* se olvida dónde ibas, no pasa nada */ } }

export function BibleReader({ data, commit, onMessage, start, onClose }: { data: AppData; commit: Commit; onMessage: (t: string, undo?: () => void) => void; start: { book: number; chapter: number }; onClose: () => void }) {
  // Abre donde pediste: el siguiente sin leer de tu ruta ya es "donde te quedaste".
  const [pos, setPos] = useState(() => book(start.book) ? start : readPos() ?? { book: 43, chapter: 1 })
  const [text, setText] = useState<BookText | null>(null)
  const [failed, setFailed] = useState(false)
  const [size, setSize] = useState(() => { try { return Number(localStorage.getItem(SIZE_KEY)) || 19 } catch { return 19 } })
  const order = data.settings.bibleOrder
  useEffect(() => {
    let alive = true
    setFailed(false)
    loadBook(pos.book).then(t => { if (alive) setText(t) }).catch(() => { if (alive) setFailed(true) })
    savePos(pos)
    window.scrollTo({ top: 0 })
    return () => { alive = false }
  }, [pos])
  const verses = text?.id === pos.book ? text.capitulos[pos.chapter - 1] ?? [] : []
  const mark = useMemo(() => data.bible.find(m => m.id === `${pos.book}:${pos.chapter}` && !m.verses), [data.bible, pos])
  const next = nextAfter(pos.book, pos.chapter, order)
  const prev = pos.chapter > 1 ? { book: pos.book, chapter: pos.chapter - 1 } : null
  // Versículos sueltos: tocas los que leíste, guardas cuánto tiempo le diste y, si quieres, tu nota.
  const [picked, setPicked] = useState<number[]>([])
  const [sheet, setSheet] = useState(false)
  const [minutes, setMinutes] = useState(5)
  const [note, setNote] = useState('')
  useEffect(() => { setPicked([]); setSheet(false) }, [pos])
  const partial = useMemo(() => parseVerses(data.bible.find(m => m.id === `${pos.book}:${pos.chapter}`)?.verses), [data.bible, pos])
  const prefix = `${book(pos.book).name} ${pos.chapter}:`
  const notes = useMemo(() => data.reading.filter(r => r.location?.startsWith(prefix) && (r.takeaway || r.note)).sort((a, b) => b.day.localeCompare(a.day)), [data.reading, prefix])
  const lectio = lectioOf()
  const togglePick = (n: number) => setPicked(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n].sort((a, b) => a - b))
  function saveVerses(e: React.MouseEvent) {
    if (!picked.length) return
    const day = dateKey()
    const label = verseLabel(book(pos.book).name, pos.chapter, picked)
    const row: Reading = { id: makeId(), day, minutes, seconds: minutes * 60, title: 'La Biblia', note: '', location: label.slice(0, 100), captureMode: 'manual', source: 'bambu', ...(note.trim() ? { takeaway: note.trim().slice(0, 2000) } : {}) }
    const before = data.bible
    commit(d => ({ ...d, reading: [...d.reading, row], bible: addVerseMark(d.bible, pos.book, pos.chapter, picked, verses.length, day) }))
    reward(e.currentTarget)
    onMessage(`${label} guardado: ${minutes} min.`, () => commit(d => ({ ...d, reading: d.reading.filter(r => r.id !== row.id), bible: before })))
    setPicked([]); setNote(''); setSheet(false)
  }
  const resize = (d: number) => { const v = Math.max(15, Math.min(28, size + d)); setSize(v); try { localStorage.setItem(SIZE_KEY, String(v)) } catch { /* preferencia del teléfono */ } }

  function finish() {
    const day = dateKey()
    const before = data.bible
    commit(d => ({ ...d, bible: addChapterMarks(d.bible, [pos], day) }))
    celebrate({ kind: 'achievement', title: `${book(pos.book).name} ${pos.chapter}`, text: 'Capítulo leído. Ya cuenta en tu racha.' })
    onMessage(`${book(pos.book).name} ${pos.chapter} marcado como leído hoy.`, () => commit(d => ({ ...d, bible: before })))
    if (next) setPos(next)
  }

  return <section className="bible-reader" aria-label="Lector de la Biblia">
    <header className="reader-top">
      <button type="button" className="ob-back" onClick={onClose} aria-label="Cerrar el lector">←</button>
      <div><strong>{book(pos.book).name} {pos.chapter}</strong><small>{book(pos.book).chapters - pos.chapter === 0 ? 'último capítulo del libro' : `faltan ${book(pos.book).chapters - pos.chapter} del libro`}</small></div>
      <div className="reader-size" role="group" aria-label="Tamaño de letra"><button type="button" onClick={() => resize(-1)} aria-label="Letra más chica">A</button><button type="button" onClick={() => resize(1)} aria-label="Letra más grande">A</button></div>
    </header>
    {failed ? <Card className="reader-missing"><BroteArt mood="sinSenal" size={80} /><h2>Este libro no está guardado.</h2><p>Con señal se abre solo. Para leer sin señal, guarda la Biblia completa con «Guardar para el viaje».</p><button type="button" className="secondary-button" onClick={() => setPos({ ...pos })}>Reintentar</button></Card>
      : !verses.length ? <p className="hint" role="status">Abriendo {book(pos.book).name} {pos.chapter}.</p>
        : <>
          <p className="reader-tip">Toca los versículos que leíste para guardarlos sueltos y escribir tu nota.</p>
          <article className="reader-text" style={{ fontSize: `${size}px` }}>{verses.map(([n, t]) => <p key={n} role="button" tabIndex={0} aria-pressed={picked.includes(n)} className={`${picked.includes(n) ? 'picked' : ''} ${partial.has(n) ? 'was-read' : ''}`} onClick={() => togglePick(n)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePick(n) } }}><sup>{n}</sup>{t}</p>)}</article>
          {notes.length > 0 && <Card className="reader-notes"><span className="eyebrow">TUS NOTAS DE ESTE CAPÍTULO</span>{notes.map(r => <div key={r.id} className="reader-note"><strong>{r.location}</strong><small>{fmtDay(r.day)}</small><p>{r.takeaway || r.note}</p></div>)}</Card>}
        </>}
    {picked.length > 0 && !sheet && <div className="verse-bar"><span><b>{verseLabel(book(pos.book).name, pos.chapter, picked)}</b>{plural(picked.length, 'versículo', 'versículos')}</span><button type="button" className="primary-button" onClick={() => setSheet(true)}>Guardar</button></div>}
    {sheet && createPortal(<div className="ql-scrim" onClick={() => setSheet(false)}><section className="ql-sheet verse-sheet" role="dialog" aria-modal="true" aria-label="Guardar versículos" onClick={e => e.stopPropagation()}>
      <span className="ql-grip" aria-hidden="true" />
      <h2>{verseLabel(book(pos.book).name, pos.chapter, picked)}</h2>
      <h3>¿Cuánto tiempo le diste?</h3>
      <p className="ql-hint">Leer y quedarte pensando cuenta igual.</p>
      <div className="ql-row">{[2, 5, 10, 15, 20].map(m => <button key={m} type="button" className={`ql-chip ${minutes === m ? 'on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>)}</div>
      <h3><span className="lectio-step">{lectio.step}</span> {lectio.question}</h3>
      <textarea className="text-input" rows={4} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional. Escríbelo tú, con tus palabras." />
      <button type="button" className="primary-button wide" onClick={saveVerses}>Guardar lectura <span>✓</span></button>
    </section></div>, document.body)}
    <footer className="reader-foot">
      {mark ? <p className="reader-done">Ya lo leíste {fmtDay(mark.day)}.</p>
        : <button type="button" className="primary-button wide" onClick={finish} disabled={!verses.length}>Terminé el capítulo <span>✓</span></button>}
      <div className="reader-nav">
        <button type="button" className="secondary-button" disabled={!prev} onClick={() => prev && setPos(prev)}>Anterior</button>
        <button type="button" className="secondary-button" disabled={!next} onClick={() => next && setPos(next)}>{next ? `${book(next.book).name} ${next.chapter}` : 'Fin'}</button>
      </div>
      <small className="reader-credit">Biblia libre Latinoamericana. Dominio público (eBible.org). Traducción en revisión.</small>
    </footer>
  </section>
}

/** Descarga los 73 libros al teléfono para leer en modo avión. Muestra avance y se puede quitar. */
export function TravelCard() {
  const [saved, setSaved] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const total = 73
  const can = typeof window !== 'undefined' && 'caches' in window
  useEffect(() => { if (can) void caches.open(BIBLE_CACHE).then(c => c.keys()).then(k => setSaved(k.length)).catch(() => setSaved(0)) }, [can])
  async function save() {
    setBusy(true)
    try {
      const cache = await caches.open(BIBLE_CACHE)
      for (let id = 1; id <= total; id++) {
        if (!(await cache.match(url(id)))) await cache.add(url(id))
        setSaved(id)
      }
    } catch { /* sin señal a medias: lo guardado se queda y el botón sigue donde iba */ } finally {
      setBusy(false)
      const k = await caches.open(BIBLE_CACHE).then(c => c.keys()).catch(() => [])
      setSaved(k.length)
    }
  }
  async function remove() { await caches.delete(BIBLE_CACHE).catch(() => false); setSaved(0) }
  if (!can) return null
  const done = saved === total
  return <Card className="travel-card">
    <span className="eyebrow">PARA EL VIAJE</span>
    <h2>{done ? 'Tu Biblia ya vive en este teléfono.' : 'Léela sin señal'}</h2>
    <p className="hint">{done ? 'Funciona en modo avión. Ocupa unos 2 MB.' : 'Guarda los 73 libros (unos 2 MB, menos que una foto). Después se lee sin internet.'}</p>
    {busy && <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={saved ?? 0} aria-label={`${saved ?? 0} de ${total} libros`}><span style={{ width: `${(saved ?? 0) / total * 100}%` }} /></div>}
    {done ? <button type="button" className="quiet-button" onClick={() => void remove()}>Quitar del teléfono</button>
      : <button type="button" className="secondary-button" disabled={busy} aria-busy={busy} onClick={() => void save()}>{busy ? `Guardando ${saved ?? 0} de ${total}` : saved ? `Terminar de guardar (${saved} de ${total})` : 'Guardar para el viaje'} <span>↓</span></button>}
  </Card>
}
