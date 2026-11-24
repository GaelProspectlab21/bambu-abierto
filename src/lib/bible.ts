/**
 * La Biblia en Bambú: canon católico, 73 libros y 1,328 capítulos. Portado de Códice.
 * Los ids 1 a 66 son los de siempre (no cambian tus registros); 67 a 73 son los deuterocanónicos.
 * Cada capítulo leído es un registro `bible` con id `${libro}:${capítulo}` (existe una vez).
 */
import type { AppData, BibleMark, BibleRange } from './model'
import { dateKey } from './model'

export type Book = { id: number; name: string; testament: 'AT' | 'NT'; chapters: number; deutero?: boolean }
export const BOOKS: Book[] = [
  { id: 1, name: 'Génesis', testament: 'AT', chapters: 50 },
  { id: 2, name: 'Éxodo', testament: 'AT', chapters: 40 },
  { id: 3, name: 'Levítico', testament: 'AT', chapters: 27 },
  { id: 4, name: 'Números', testament: 'AT', chapters: 36 },
  { id: 5, name: 'Deuteronomio', testament: 'AT', chapters: 34 },
  { id: 6, name: 'Josué', testament: 'AT', chapters: 24 },
  { id: 7, name: 'Jueces', testament: 'AT', chapters: 21 },
  { id: 8, name: 'Rut', testament: 'AT', chapters: 4 },
  { id: 9, name: '1 Samuel', testament: 'AT', chapters: 31 },
  { id: 10, name: '2 Samuel', testament: 'AT', chapters: 24 },
  { id: 11, name: '1 Reyes', testament: 'AT', chapters: 22 },
  { id: 12, name: '2 Reyes', testament: 'AT', chapters: 25 },
  { id: 13, name: '1 Crónicas', testament: 'AT', chapters: 29 },
  { id: 14, name: '2 Crónicas', testament: 'AT', chapters: 36 },
  { id: 15, name: 'Esdras', testament: 'AT', chapters: 10 },
  { id: 16, name: 'Nehemías', testament: 'AT', chapters: 13 },
  { id: 17, name: 'Ester', testament: 'AT', chapters: 10 },
  { id: 18, name: 'Job', testament: 'AT', chapters: 42 },
  { id: 19, name: 'Salmos', testament: 'AT', chapters: 150 },
  { id: 20, name: 'Proverbios', testament: 'AT', chapters: 31 },
  { id: 21, name: 'Eclesiastés', testament: 'AT', chapters: 12 },
  { id: 22, name: 'Cantares', testament: 'AT', chapters: 8 },
  { id: 23, name: 'Isaías', testament: 'AT', chapters: 66 },
  { id: 24, name: 'Jeremías', testament: 'AT', chapters: 52 },
  { id: 25, name: 'Lamentaciones', testament: 'AT', chapters: 5 },
  { id: 26, name: 'Ezequiel', testament: 'AT', chapters: 48 },
  { id: 27, name: 'Daniel', testament: 'AT', chapters: 14 },
  { id: 28, name: 'Oseas', testament: 'AT', chapters: 14 },
  { id: 29, name: 'Joel', testament: 'AT', chapters: 3 },
  { id: 30, name: 'Amós', testament: 'AT', chapters: 9 },
  { id: 31, name: 'Abdías', testament: 'AT', chapters: 1 },
  { id: 32, name: 'Jonás', testament: 'AT', chapters: 4 },
  { id: 33, name: 'Miqueas', testament: 'AT', chapters: 7 },
  { id: 34, name: 'Nahúm', testament: 'AT', chapters: 3 },
  { id: 35, name: 'Habacuc', testament: 'AT', chapters: 3 },
  { id: 36, name: 'Sofonías', testament: 'AT', chapters: 3 },
  { id: 37, name: 'Hageo', testament: 'AT', chapters: 2 },
  { id: 38, name: 'Zacarías', testament: 'AT', chapters: 14 },
  { id: 39, name: 'Malaquías', testament: 'AT', chapters: 4 },
  { id: 40, name: 'Mateo', testament: 'NT', chapters: 28 },
  { id: 41, name: 'Marcos', testament: 'NT', chapters: 16 },
  { id: 42, name: 'Lucas', testament: 'NT', chapters: 24 },
  { id: 43, name: 'Juan', testament: 'NT', chapters: 21 },
  { id: 44, name: 'Hechos', testament: 'NT', chapters: 28 },
  { id: 45, name: 'Romanos', testament: 'NT', chapters: 16 },
  { id: 46, name: '1 Corintios', testament: 'NT', chapters: 16 },
  { id: 47, name: '2 Corintios', testament: 'NT', chapters: 13 },
  { id: 48, name: 'Gálatas', testament: 'NT', chapters: 6 },
  { id: 49, name: 'Efesios', testament: 'NT', chapters: 6 },
  { id: 50, name: 'Filipenses', testament: 'NT', chapters: 4 },
  { id: 51, name: 'Colosenses', testament: 'NT', chapters: 4 },
  { id: 52, name: '1 Tesalonicenses', testament: 'NT', chapters: 5 },
  { id: 53, name: '2 Tesalonicenses', testament: 'NT', chapters: 3 },
  { id: 54, name: '1 Timoteo', testament: 'NT', chapters: 6 },
  { id: 55, name: '2 Timoteo', testament: 'NT', chapters: 4 },
  { id: 56, name: 'Tito', testament: 'NT', chapters: 3 },
  { id: 57, name: 'Filemón', testament: 'NT', chapters: 1 },
  { id: 58, name: 'Hebreos', testament: 'NT', chapters: 13 },
  { id: 59, name: 'Santiago', testament: 'NT', chapters: 5 },
  { id: 60, name: '1 Pedro', testament: 'NT', chapters: 5 },
  { id: 61, name: '2 Pedro', testament: 'NT', chapters: 3 },
  { id: 62, name: '1 Juan', testament: 'NT', chapters: 5 },
  { id: 63, name: '2 Juan', testament: 'NT', chapters: 1 },
  { id: 64, name: '3 Juan', testament: 'NT', chapters: 1 },
  { id: 65, name: 'Judas', testament: 'NT', chapters: 1 },
  { id: 66, name: 'Apocalipsis', testament: 'NT', chapters: 22 },
  { id: 67, name: 'Tobías', testament: 'AT', chapters: 14, deutero: true },
  { id: 68, name: 'Judit', testament: 'AT', chapters: 16, deutero: true },
  { id: 69, name: '1 Macabeos', testament: 'AT', chapters: 16, deutero: true },
  { id: 70, name: '2 Macabeos', testament: 'AT', chapters: 15, deutero: true },
  { id: 71, name: 'Sabiduría', testament: 'AT', chapters: 19, deutero: true },
  { id: 72, name: 'Eclesiástico', testament: 'AT', chapters: 51, deutero: true },
  { id: 73, name: 'Baruc', testament: 'AT', chapters: 6, deutero: true },
]

export const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0)
/** El orden de la Biblia católica: los deuterocanónicos van en su lugar, no al final. */
export const CANON: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 67, 68, 17, 69, 70, 18, 19, 20, 21, 22, 71, 72,
  23, 24, 25, 73, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66]

/** La ruta de Códice: empieza por Jesús, alterna narrativa y cartas, deja lo denso al final. */
export const ETAPAS: { nombre: string; porQue: string; libros: number[] }[] = [
  { nombre: 'Jesús', porQue: 'el corazón de todo: quién es y qué hizo', libros: [43, 41] },
  { nombre: 'Los orígenes', porQue: 'de la creación a la salida de Egipto', libros: [1, 2] },
  { nombre: 'La historia sigue', porQue: 'Lucas y el nacimiento de la iglesia', libros: [42, 44] },
  { nombre: 'Las cartas esenciales', porQue: 'qué significa todo lo anterior, en la práctica', libros: [45, 48, 49, 50, 51, 59] },
  { nombre: 'Sabiduría y cantos', porQue: 'la poesía y el consejo de Israel', libros: [19, 20, 21, 71, 72, 18, 22] },
  { nombre: 'La tierra y los reyes', porQue: 'Israel entra a la tierra, pide rey y se parte en dos', libros: [5, 6, 7, 8, 9, 10, 11, 12] },
  { nombre: 'Mateo y el resto de cartas', porQue: 'el evangelio que ata el AT y las cartas que faltaban', libros: [40, 46, 47, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65] },
  { nombre: 'Historias de fe', porQue: 'familias y pueblos que confían en Dios en tiempos difíciles', libros: [67, 68, 69, 70] },
  { nombre: 'Los profetas mayores', porQue: 'las voces grandes del exilio', libros: [23, 24, 25, 73, 26, 27] },
  { nombre: 'Los doce', porQue: 'los profetas menores: cortos y directos', libros: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39] },
  { nombre: 'La ley y el regreso', porQue: 'lo más denso, para cuando ya tienes ritmo', libros: [3, 4, 13, 14, 15, 16, 17] },
  { nombre: 'El final', porQue: 'la visión que cierra el libro', libros: [66] },
]
export const ROUTE: number[] = ETAPAS.flatMap(e => e.libros)
if (new Set(ROUTE).size !== BOOKS.length || ROUTE.length !== BOOKS.length) throw new Error('La ruta debe cubrir cada libro una vez.')
if (new Set(CANON).size !== BOOKS.length || CANON.length !== BOOKS.length) throw new Error('El orden católico debe cubrir cada libro una vez.')

export const book = (id: number): Book => BOOKS[id - 1]
export const etapaDe = (id: number) => ETAPAS.find(e => e.libros.includes(id))
export function bookOrder(order: 'ruta' | 'canonico'): number[] {
  return order === 'ruta' ? ROUTE : CANON
}

/** "Marcos 3-5, 7" a partir de rangos. */
export function describeRanges(ranges: BibleRange[]): string {
  const byBook = new Map<number, number[]>()
  ranges.forEach(r => { for (let c = r.from; c <= r.to; c++) byBook.set(r.book, [...(byBook.get(r.book) ?? []), c]) })
  return [...byBook.entries()].map(([id, chapters]) => `${book(id).name} ${compress(chapters)}`).join(' · ')
}
export function compress(chapters: number[]): string {
  const sorted = [...new Set(chapters)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    let j = i
    while (sorted[j + 1] === sorted[j] + 1) j++
    parts.push(j > i ? `${sorted[i]}-${sorted[j]}` : `${sorted[i]}`)
    i = j
  }
  return parts.join(', ')
}
export function toRanges(marks: { book: number; chapter: number }[]): BibleRange[] {
  const out: BibleRange[] = []
  ;[...marks].sort((a, b) => a.book - b.book || a.chapter - b.chapter).forEach(m => {
    const last = out[out.length - 1]
    if (last && last.book === m.book && last.to + 1 === m.chapter) last.to = m.chapter
    else if (!(last && last.book === m.book && m.chapter >= last.from && m.chapter <= last.to)) out.push({ book: m.book, from: m.chapter, to: m.chapter })
  })
  return out
}

export type BibleProgress = {
  read: number; partial: number; percent: number; byBook: Map<number, Map<number, BibleMark>>
  next: { book: number; chapter: number } | null; perDay30: number; finishOn: string | null; daysActive30: number
}
export function bibleProgress(data: AppData, order: 'ruta' | 'canonico', today = dateKey()): BibleProgress {
  const byBook = new Map<number, Map<number, BibleMark>>()
  data.bible.forEach(mark => {
    if (!byBook.has(mark.book)) byBook.set(mark.book, new Map())
    byBook.get(mark.book)!.set(mark.chapter, mark)
  })
  const full = data.bible.filter(m => !m.verses).length
  const partial = data.bible.length - full
  let next: BibleProgress['next'] = null
  for (const id of bookOrder(order)) {
    const done = byBook.get(id)
    const b = book(id)
    for (let c = 1; c <= b.chapters; c++) if (!done?.has(c) || done.get(c)!.verses) { next = { book: id, chapter: c }; break }
    if (next) break
  }
  const since = new Date(`${today}T12:00:00`)
  since.setDate(since.getDate() - 29)
  const recent = data.bible.filter(m => m.day >= dateKey(since) && m.day <= today)
  // La velocidad cuenta solo capítulos completos; los parciales son actividad, no avance.
  const perDay30 = recent.filter(m => !m.verses).length / 30
  const remaining = TOTAL_CHAPTERS - full
  let finishOn: string | null = null
  if (perDay30 > 0 && remaining > 0) {
    const end = new Date(`${today}T12:00:00`)
    end.setDate(end.getDate() + Math.ceil(remaining / perDay30))
    finishOn = dateKey(end)
  }
  return { read: full, partial, percent: Math.round(full / TOTAL_CHAPTERS * 1000) / 10, byBook, next, perDay30, finishOn, daysActive30: new Set(recent.map(m => m.day)).size }
}

/**
 * Suma capítulos leídos completos. Un capítulo que ya estaba completo conserva su fecha (releerlo
 * no la borra del historial), salvo que la nueva sea anterior: entonces gana la primera vez.
 * Uno que estaba parcial pasa a completo. Si nada cambia, devuelve la misma lista.
 */
export function addChapterMarks(bible: BibleMark[], marks: { book: number; chapter: number }[], day: string, source = 'bambu'): BibleMark[] {
  const full = new Map(bible.filter(m => !m.verses).map(m => [m.id, m]))
  const fresh = new Map<string, BibleMark>()
  for (const { book, chapter } of marks) {
    const id = `${book}:${chapter}`
    const old = full.get(id)
    if (old && old.day <= day) continue
    fresh.set(id, { id, book, chapter, day, source })
  }
  if (!fresh.size) return bible
  return [...bible.filter(m => !fresh.has(m.id)), ...fresh.values()]
}

/** Los siguientes `count` capítulos sin leer, en el orden elegido. Para sugerir al cerrar una lectura. */
export function nextChapters(data: AppData, order: 'ruta' | 'canonico', count = 3): { book: number; chapter: number }[] {
  const read = new Set(data.bible.filter(m => !m.verses).map(m => m.id))
  const out: { book: number; chapter: number }[] = []
  for (const id of bookOrder(order)) {
    for (let c = 1; c <= book(id).chapters && out.length < count; c++) if (!read.has(`${id}:${c}`)) out.push({ book: id, chapter: c })
    if (out.length >= count) break
  }
  return out
}

/** Busca un libro por nombre sin tildes: "genesis", "1 juan", "jn". */
export function findBook(query: string): Book | undefined {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
  const q = norm(query)
  return BOOKS.find(b => norm(b.name) === q) ?? BOOKS.find(b => norm(b.name).startsWith(q))
}

/** El capítulo que sigue en tu orden (ruta o católico): al terminar uno, el lector sigue solo. */
export function nextAfter(id: number, chapter: number, order: 'ruta' | 'canonico'): { book: number; chapter: number } | null {
  if (chapter < book(id).chapters) return { book: id, chapter: chapter + 1 }
  const list = bookOrder(order)
  const next = list[list.indexOf(id) + 1]
  return next ? { book: next, chapter: 1 } : null
}
