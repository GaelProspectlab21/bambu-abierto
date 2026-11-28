import type { FoodGroup } from './model'
import { registrarAlimentos, type Food } from './foods'

/** [codigo, nombre, marca, porcion, gramos, kcal, proteina, carbs, azucar, grasa, fibra, sodio_mg], por 100 g. */
export type FilaMx = [string, string, string, string, number, number, number, number, number, number, number, number]

const GRUPOS: [RegExp, FoodGroup][] = [
  [/refresco|jugo|n[eé]ctar|bebida|agua |soda|t[eé] |caf[eé]|energ[eé]tica|limonada/i, 'bebida'],
  [/galleta|chocolate|dulce|pastel|gomita|caramelo|helado|mermelada|cajeta|chicle|bombon|papas|frituras|chips|botana|churrito|totopo/i, 'dulce'],
  [/yogur|yoghurt|queso|leche|crema/i, 'lacteo'],
  [/cereal|avena|pan |tortilla|arroz|pasta|harina|granola|tostada/i, 'cereal'],
  [/at[uú]n|pollo|jam[oó]n|salchicha|carne|huevo|prote[ií]na|sardina|pavo/i, 'proteina'],
  [/frijol|lenteja|garbanzo/i, 'leguminosa'],
  [/cacahuate|almendra|nuez|aceite|mantequilla|mayonesa/i, 'grasa'],
  [/fruta|manzana|mango|pl[aá]tano|durazno|pi[nñ]a/i, 'fruta'],
  [/verdura|ensalada|chile|elote|chicharo|zanahoria/i, 'verdura'],
]

/** Una fila de la etiqueta pasa a alimento del catálogo, por la porción que dice el empaque (o por 100 g). */
export function filaAFood([code, nombre, marca, porcion, gramos, kcal, prot, carbs, azucar, grasa, fibra, sodio]: FilaMx): Food {
  const f = gramos > 0 && gramos <= 1000 ? gramos / 100 : 1
  const unit = gramos > 0 && gramos <= 1000 ? (porcion ? `${porcion}` : `porción (${gramos} g)`) : '100 g'
  const r = (v: number) => Math.round(v * f * 10) / 10
  const group = GRUPOS.find(([re]) => re.test(` ${nombre} `))?.[1] ?? 'platillo'
  return { id: `off-${code}`, name: marca && !nombre.toLowerCase().includes(marca.toLowerCase()) ? `${nombre}, ${marca}` : nombre, unit: unit.slice(0, 30), kcal: Math.round(kcal * f), protein: r(prot), group,
    carbs: r(carbs), sugar: r(azucar), fat: r(grasa), fiber: r(fibra), sodium: Math.round(sodio * f), brand: marca || undefined, source: 'Open Food Facts' }
}

let promesa: Promise<number> | null = null
/** Se baja una vez por sesión y el service worker lo guarda. Si no hay señal, el catálogo casero sigue. */
export function cargarEmpaquetados(): Promise<number> {
  promesa ??= fetch('alimentos/mx.json').then(r => r.ok ? r.json() : { productos: [] }).then((j: { productos: FilaMx[] }) => {
    const list = (j.productos ?? []).map(filaAFood)
    registrarAlimentos(list)
    return list.length
  }).catch(() => { promesa = null; return 0 })
  return promesa
}
