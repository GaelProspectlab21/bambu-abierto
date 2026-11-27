/**
 * El pie de cada página: un día versículo, el siguiente una cita de alguien que vivió lo mismo.
 * Quien no usa la Biblia en bambú ve solo citas (no se le impone algo que no eligió).
 * Mismo pie todo el día, otro mañana; cada página rota por su cuenta.
 */
import { PAGE_VERSES } from './pageVerses'
import { PAGE_QUOTES } from './pageQuotes'

export type Pie = { kind: 'verso'; text: string; ref: string } | { kind: 'cita'; text: string; who: string; source: string }

export function dayNumber(day: string): number { return Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000) }

export function pieDe(page: string, day: string, biblia: boolean): Pie | null {
  const verses = biblia ? PAGE_VERSES[page] ?? [] : []
  const quotes = PAGE_QUOTES[page] ?? []
  if (!verses.length && !quotes.length) return null
  const n = dayNumber(day)
  const useVerse = verses.length && (!quotes.length || n % 2 === 0)
  if (useVerse) { const v = verses[Math.floor(n / 2) % verses.length]; return { kind: 'verso', text: v.text, ref: v.ref } }
  const q = quotes[Math.floor(n / 2) % quotes.length]
  return { kind: 'cita', text: q.text, who: q.who, source: q.source }
}
