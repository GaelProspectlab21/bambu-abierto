/**
 * Versículos sueltos: leer 3 o 4 versículos y quedarte reflexionando también es leer la Biblia.
 * Se guardan en la marca del capítulo (`BibleMark.verses`, ej. "16-18,21"), que ya existía para
 * los capítulos a medias: no cambia la forma de ningún registro.
 */
import type { BibleMark } from './model'

/** "1-3,5" → {1,2,3,5}. Lo que no se entiende se ignora. */
export function parseVerses(text: string | undefined): Set<number> {
  const out = new Set<number>()
  for (const part of (text ?? '').split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/)
    if (!m) continue
    const a = Number(m[1]), b = Number(m[2] ?? m[1])
    for (let v = Math.min(a, b); v <= Math.max(a, b) && v - Math.min(a, b) < 200; v++) out.add(v)
  }
  return out
}

/** {1,2,3,5} → "1-3,5". Corto para caber en los 60 caracteres del registro. */
export function formatVerses(verses: Iterable<number>): string {
  const list = [...new Set(verses)].filter(v => Number.isInteger(v) && v > 0).sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < list.length; i++) {
    let j = i
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++
    parts.push(i === j ? `${list[i]}` : `${list[i]}-${list[j]}`)
    i = j
  }
  return parts.join(',')
}

/**
 * Suma versículos leídos a un capítulo. Si con ellos ya leíste todos, el capítulo queda completo.
 * Un capítulo que ya estaba completo no se toca.
 */
export function addVerseMark(bible: BibleMark[], book: number, chapter: number, verses: number[], total: number, day: string): BibleMark[] {
  const id = `${book}:${chapter}`
  const old = bible.find(m => m.id === id)
  if (old && !old.verses) return bible
  const all = parseVerses(old?.verses)
  verses.forEach(v => all.add(v))
  const complete = total > 0 && all.size >= total
  let text = complete ? undefined : formatVerses(all)
  // El campo guarda 60 caracteres: si una lectura muy salteada no cabe, se guarda el tramo de primera a última.
  if (text && text.length > 60) { const s = [...all].sort((a, b) => a - b); text = `${s[0]}-${s[s.length - 1]}` }
  const mark: BibleMark = { id, book, chapter, day: old?.day && old.day < day ? old.day : day, source: 'bambu', ...(text ? { verses: text } : {}) }
  if (complete) mark.day = day
  return [...bible.filter(m => m.id !== id), mark]
}

/** "Juan 3:16-18" para el registro de lectura y las notas. */
export function verseLabel(bookName: string, chapter: number, verses: number[]): string {
  return `${bookName} ${chapter}:${formatVerses(verses)}`
}

/**
 * Una sola pregunta por día, de la Lectio Divina (leer, meditar, orar, actuar). Bambú pregunta;
 * la reflexión la escribes tú. Cambia con el día de la semana para que no se vuelva automática.
 */
export const LECTIO: { step: string; question: string }[] = [
  { step: 'Leer', question: '¿Qué palabra o frase se te quedó?' },
  { step: 'Meditar', question: '¿Qué te está diciendo esto a ti, hoy?' },
  { step: 'Orar', question: '¿Qué le quieres responder a Dios?' },
  { step: 'Actuar', question: '¿Qué vas a hacer distinto hoy por esto?' },
  { step: 'Meditar', question: '¿Dónde ves a Jesús en estos versículos?' },
  { step: 'Leer', question: '¿Qué te sorprendió o no entendiste?' },
  { step: 'Contemplar', question: '¿A quién te recuerda esto y qué harías por esa persona?' },
]
export function lectioOf(date = new Date()): { step: string; question: string } { return LECTIO[date.getDay()] }
