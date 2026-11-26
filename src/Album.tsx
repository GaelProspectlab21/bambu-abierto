import { useEffect, useMemo, useState } from 'react'
import type { AppData } from './lib/model'
import { album, RARITY, type Card } from './lib/album'
import { celebrate, fmtDay } from './ui'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { MonsterArt } from './Aventura'

const KINDS = ['Todas', 'Monstruos', 'Hazañas', 'Temporada'] as const
const SEEN = 'bambu.album.visto'

function Art({ c, size }: { c: Card; size: number }) {
  if (!c.earned) return <span className="d-card-q">?</span>
  return c.monster ? <MonsterArt m={c.monster} size={size} /> : <DuoIcon name={c.icon ?? 'estrella'} size={size * 0.7} />
}

export function CardMini({ c }: { c: Card }) {
  return <span className={`d-cardm ${c.rarity} ${c.earned ? '' : 'locked'}`}><Art c={c} size={30} /></span>
}

function CardView({ c, big = false, onClick }: { c: Card; big?: boolean; onClick?: () => void }) {
  return <button type="button" className={`d-tcard ${c.rarity} ${c.earned ? '' : 'locked'} ${big ? 'big' : ''}`} onClick={onClick}>
    <span className="d-tcard-art"><Art c={c} size={big ? 120 : 56} /></span>
    <b>{c.earned || big ? c.name : '???'}</b>
    <small>{RARITY[c.rarity]}</small>
  </button>
}

export function AlbumSheet({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>('Todas')
  const [open, setOpen] = useState<Card | null>(null)
  const list = cards.filter(c => kind === 'Todas' || c.kind === kind)
  const got = cards.filter(c => c.earned).length
  return <Sheet title="Álbum de cartas" tall onClose={onClose}>
    <div className="d-goal-top"><b>{got} de {cards.length} cartas</b><span>{Object.entries(RARITY).map(([r, n]) => `${cards.filter(c => c.rarity === r && c.earned).length} ${n.toLowerCase()}`).slice(2).join(' · ')}</span></div>
    <div className="d-bar gold"><span style={{ width: `${got / cards.length * 100}%` }} /></div>
    <div className="d-chips scroll">{KINDS.map(k => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>
    <div className="d-tcards">{list.map(c => <CardView key={c.id} c={c} onClick={() => setOpen(c)} />)}</div>
    {open && <div className="d-card-zoom" onClick={() => setOpen(null)} role="dialog" aria-label={open.name}>
      <CardView c={open} big />
      <p>{open.earned ? open.text : `Cómo conseguirla: ${open.text}`}</p>
      {open.earned && open.day && <small>Conseguida {['hoy', 'ayer'].includes(fmtDay(open.day)) ? fmtDay(open.day) : `el ${fmtDay(open.day)}`}</small>}
      <button type="button" className="d-btn white wide" onClick={() => setOpen(null)}>Cerrar</button>
    </div>}
  </Sheet>
}

export function useNewCards(data: AppData) {
  const earned = useMemo(() => album(data).filter(c => c.earned), [data])
  useEffect(() => {
    let seen: string[] | null = null
    try { seen = JSON.parse(localStorage.getItem(SEEN) ?? 'null') } catch { seen = null }
    const ids = earned.map(c => c.id)
    try { localStorage.setItem(SEEN, JSON.stringify(ids)) } catch { return }
    if (!seen) return
    const fresh = earned.filter(c => !seen!.includes(c.id))
    if (fresh.length) celebrate({ kind: 'achievement', title: fresh.length > 1 ? `¡${fresh.length} cartas nuevas!` : '¡Carta nueva!', text: `${fresh[0].name} · ${RARITY[fresh[0].rarity]}. Mírala en tu álbum.` })
  }, [earned])
}
