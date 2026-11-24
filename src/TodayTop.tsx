import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey, modulesOf, type AppData } from './lib/model'
import { realReading, streak } from './lib/progress'
import { game } from './lib/gamification'
import { dayTime, neverTwice, votesOn, votesWeek } from './lib/identity'
import { Icon } from './Icons'
import { plural } from './lib/text'
import type { Section } from './TodayPage'

/**
 * La barra de arriba: racha de lectura, cosas hechas hoy y nivel, cada una con su etiqueta.
 * Cada número late cuando sube, para que notes lo que acabas de ganar.
 */
export function TopStats({ data, go }: { data: AppData; go: (s: Section) => void }) {
  const today = dateKey()
  const mods = modulesOf(data.settings)
  const rs = useMemo(() => streak(data.reading.filter(realReading).map(r => r.day), today), [data.reading, today])
  const votes = useMemo(() => votesOn(data, today), [data, today])
  const g = useMemo(() => game(data, today), [data, today])
  const pct = Math.round((g.xp - g.levelStart) / Math.max(1, g.levelEnd - g.levelStart) * 100)
  const bump = useBump(votes.total)
  const flame = useBump(rs.current)
  // Tres tarjetas con su etiqueta: el número solo no dice nada si no sabes qué cuenta.
  return <div className="top-stats" role="group" aria-label="Tu marcador">
    {mods.reading && <button type="button" className={`ts-tile ts-streak ${rs.todayDone ? 'lit' : ''} ${flame ? 'bump' : ''}`} onClick={() => go('Lectura')} aria-label={`Racha de lectura: ${plural(rs.current, 'día', 'días')}${rs.todayDone ? '' : '. Hoy todavía no lees.'}`}>
      <span className="ts-top"><Icon name="racha" size={18} /><b>{rs.current}</b></span><small>{rs.current === 1 ? 'día leyendo' : 'días leyendo'}</small></button>}
    <button type="button" className={`ts-tile ts-votes ${votes.total ? 'lit' : ''} ${bump ? 'bump' : ''}`} onClick={() => go('Historial')} aria-label={`${plural(votes.total, 'cosa hecha', 'cosas hechas')} hoy`}>
      <span className="ts-top"><Icon name="check" size={18} /><b>{votes.total}</b></span><small>{votes.total === 1 ? 'hecho hoy' : 'hechos hoy'}</small></button>
    <button type="button" className="ts-tile ts-level" onClick={() => go('Historial')} aria-label={`Nivel ${g.level}, ${g.rank}. ${pct}% para el siguiente.`}>
      <span className="ts-top"><svg viewBox="0 0 36 36" width="22" height="22" aria-hidden="true"><circle cx="18" cy="18" r="14" className="ring-bg" /><circle cx="18" cy="18" r="14" className="ring-fg" style={{ strokeDasharray: `${pct * 0.88} 88` }} /></svg><b>{g.level}</b></span><small>nivel · {pct}%</small></button>
  </div>
}

/** true durante medio segundo cada vez que el número sube. */
function useBump(value: number): boolean {
  const prev = useRef(value)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (value > prev.current) { setOn(true); const t = window.setTimeout(() => setOn(false), 650); prev.current = value; return () => window.clearTimeout(t) }
    prev.current = value
  }, [value])
  return on
}

/**
 * Tu día en una tira: en qué se fue el tiempo que mediste y tus votos de la semana.
 * Pierre Dalati: no perdiste la atención, te desconectaste de tu propio progreso. Esto lo reconecta.
 */
export function DayLedger({ data }: { data: AppData }) {
  const today = dateKey()
  const t = useMemo(() => dayTime(data, today), [data, today])
  const week = useMemo(() => votesWeek(data, today), [data, today])
  const mods = modulesOf(data.settings)
  const max = Math.max(1, ...week.map(w => w.total))
  const parts = [
    mods.reading ? { k: 'lectura', label: 'Lectura', min: t.lectura } : null,
    mods.focus ? { k: 'enfoque', label: 'Enfoque', min: t.enfoque } : null,
    mods.training ? { k: 'entreno', label: 'Movimiento', min: t.entreno } : null,
  ].filter((p): p is { k: string; label: string; min: number } => !!p)
  const total = parts.reduce((s, p) => s + p.min, 0)
  return <section className="card ledger" aria-label="Tu día medido">
    <div className="ledger-head"><span className="eyebrow">TU DÍA MEDIDO</span><strong>{hm(total)}</strong></div>
    <div className="ledger-bar" aria-hidden="true">{total ? parts.filter(p => p.min).map(p => <i key={p.k} className={`lb-${p.k}`} style={{ flexGrow: p.min }} />) : <i className="lb-empty" />}</div>
    <ul className="ledger-keys">{parts.map(p => <li key={p.k}><i className={`lb-${p.k}`} aria-hidden="true" />{p.label}<b>{p.min ? hm(p.min) : '0'}</b></li>)}
      {t.rescates > 0 && <li><i className="lb-rescate" aria-hidden="true" />Rescates<b>{t.rescates}</b></li>}</ul>
    <span className="ledger-sub">Cosas hechas por día, últimos 7 días</span>
    <div className="ledger-week" role="img" aria-label={`Cosas hechas en los últimos 7 días: ${week.map(w => w.total).join(', ')}`}>
      {week.map((w, i) => <span key={w.day} className={i === 6 ? 'today' : ''}><i style={{ height: `${Math.max(6, w.total / max * 100)}%` }} className={w.total ? 'on' : ''} /><small>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(`${w.day}T12:00:00`).getDay()]}</small></span>)}
    </div>
  </section>
}

/** Nunca falles dos veces: una línea, sin regaño, solo si aplica. */
export function NeverTwice({ data, go }: { data: AppData; go: (s: Section) => void }) {
  const mods = modulesOf(data.settings)
  const state = useMemo(() => neverTwice(new Set(data.reading.filter(realReading).map(r => r.day))), [data.reading])
  if (!mods.reading || !state) return null
  return <button type="button" className={`never-twice nt-${state}`} onClick={() => go('Lectura')}>
    <Icon name="racha" size={22} />
    <span>{state === 'save'
      ? <><strong>Ayer se te fue. Nunca dos veces.</strong><small>Cinco minutos hoy y el hábito sigue vivo.</small></>
      : <><strong>Hoy arranca otra racha.</strong><small>Sin culpa. Cinco minutos y ya es el día uno.</small></>}</span>
  </button>
}

function hm(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

const KIND_LABEL: Record<string, string> = { lectura: 'Lectura', enfoque: 'Enfoque', entreno: 'Movimiento', habito: 'Hábitos', tarea: 'Tareas', medida: 'Medir tu día', promesa: 'Promesas', rescate: 'Rescates', estira: 'Estiramiento' }
/** Tus votos de la semana por tipo: la identidad se construye con evidencia (Hábitos atómicos, cap. 2). */
export function VotesCard({ data }: { data: AppData }) {
  const today = dateKey()
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => votesOn(data, shiftKey(today, i - 6))), [data, today])
  const total = week.reduce((s, v) => s + v.total, 0)
  const by = week.reduce<Record<string, number>>((acc, v) => { Object.entries(v.by).forEach(([k, n]) => { acc[k] = (acc[k] ?? 0) + n }); return acc }, {})
  const top = Object.entries(by).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const north = data.profile.north?.trim()
  return <section className="card votes-card" aria-label="Tus hechos de la semana">
    <span className="eyebrow">TUS HECHOS · 7 DÍAS</span>
    <h2><b>{total}</b> {total === 1 ? 'cosa hecha' : 'cosas hechas'} esta semana</h2>
    <p>Cada cosa buena que haces y registras es una prueba de que te estás convirtiendo en quien quieres ser.</p>
    {north && <blockquote className="votes-north">{north}</blockquote>}
    {top.length > 0 && <ul className="votes-list">{top.map(([k, n]) => <li key={k}><span>{KIND_LABEL[k]}</span><i style={{ width: `${n / top[0][1] * 100}%` }} /><b>{n}</b></li>)}</ul>}
  </section>
}
function shiftKey(day: string, n: number): string { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return dateKey(d) }
