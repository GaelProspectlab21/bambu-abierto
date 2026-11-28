import type { AppData } from './model'
import { foodById } from './foods'
import { planFor, type AdultPlan, type GrowthPlan } from './nutrition'

/**
 * v12: los nutrientes que no son calorías ni proteína: carbohidratos, azúcar, grasa, fibra y sodio.
 * No cambian la forma de una comida guardada: se calculan al mostrar, con el `foodId` que cada
 * alimento ya trae. Los caseros salen de esta tabla (USDA FoodData Central, por la porción del
 * catálogo, redondeado: son estimados). Los empaquetados traen su etiqueta (Open Food Facts).
 */
export type Nutr = { carbs: number; sugar: number; fat: number; fiber: number; sodium: number }
type Fila = [carbs: number, sugar: number, fat: number, fiber: number, sodiumMg: number]

const CASEROS: Record<string, Fila> = {
  huevo: [0.4, 0.2, 4.8, 0, 71], pollo: [0, 0, 3.6, 0, 74], res: [0, 0, 13, 0, 60], molida: [0, 0, 13, 0, 70], atun: [0, 0, 1, 0, 300],
  pescado: [0, 0, 2.5, 0, 90], jamon: [1, 1, 1, 0, 500], salchicha: [1.5, 0.5, 11, 0, 450], cerdo: [0, 0, 14, 0, 60], polvo: [3, 1.5, 1.5, 0, 120],
  leche: [12, 12, 8, 0, 105], 'leche-light': [12, 12, 2.5, 0, 110], 'yogur-griego': [6, 6, 0.7, 0, 60], yogur: [24, 20, 3, 0, 90],
  panela: [1.5, 1, 7, 0, 200], oaxaca: [1, 0, 7.5, 0, 180], amarillo: [1.5, 1, 4.5, 0, 280], requeson: [3, 3, 6, 0, 350],
  frijoles: [20, 0.3, 0.5, 7.5, 200], refritos: [18, 0.5, 3, 6, 450], lentejas: [20, 1.8, 0.4, 7.8, 2], garbanzo: [22, 4, 2, 6, 5], hummus: [4, 0, 5, 1.8, 110],
  cacahuates: [5, 1.4, 14, 2.4, 5], tortilla: [13, 0.3, 0.8, 1.8, 3], 'tortilla-harina': [22, 1, 3.5, 1, 330], arroz: [22, 0, 0.2, 0.3, 1],
  bolillo: [33, 2, 2, 1.5, 350], 'pan-caja': [13, 2, 1, 1, 130], avena: [27, 0.5, 2.6, 4, 2], pasta: [43, 0.8, 1.3, 2.5, 1], 'cereal-caja': [27, 12, 1, 1, 180],
  papa: [37, 2, 0.2, 4, 15], tostada: [8, 0.2, 3, 1, 40], elote: [19, 6, 1.4, 2.4, 15], granola: [20, 6, 5, 2.5, 10], camote: [26, 5.4, 0.1, 3.9, 36],
  amaranto: [19, 0.5, 2, 2, 1], platano: [27, 14, 0.4, 3.1, 1], manzana: [25, 19, 0.3, 4.4, 2], naranja: [15, 12, 0.2, 3.1, 0], papaya: [16, 11, 0.4, 2.5, 12],
  mango: [25, 23, 0.6, 2.6, 2], fresas: [12, 7, 0.5, 3, 2], sandia: [12, 10, 0.2, 0.6, 2], uvas: [27, 23, 0.2, 1.4, 3], pasas: [24, 18, 0.1, 1.1, 3],
  ensalada: [3, 1, 0.2, 1.5, 20], brocoli: [11, 2, 0.6, 5, 60], calabacita: [4, 2.5, 0.4, 1.2, 10], zanahoria: [6, 3, 0.1, 1.7, 42], jitomate: [5, 3, 0.2, 1.5, 6],
  nopales: [5, 1.5, 0.1, 3, 30], verduras: [10, 4, 0.3, 4, 60], aguacate: [4, 0.3, 7, 3.3, 4], aceite: [0, 0, 14, 0, 0], 'crema-cacahuate': [3.5, 1.5, 8, 1, 70],
  nueces: [6, 1.3, 16, 3, 0], pepitas: [4, 0.4, 14, 1.8, 5], mantequilla: [0, 0, 4, 0, 30], crema: [0.5, 0.5, 4.5, 0, 10], mayonesa: [0.1, 0.1, 10, 0, 90],
  sardinas: [0, 0, 11, 0, 500], 'taco-pastor': [14, 1.5, 6, 1.5, 350], 'taco-asada': [13, 0.5, 7, 1.5, 300], quesadilla: [17, 0.5, 11, 1.5, 400],
  torta: [50, 5, 18, 3, 1200], tamal: [30, 2, 15, 3, 500], enchiladas: [40, 6, 22, 6, 1100], chilaquiles: [55, 6, 25, 6, 1100], pozole: [30, 3, 10, 5, 1300],
  'sopa-fideo': [22, 3, 4, 1.5, 800], burrito: [50, 3, 18, 6, 1100], hamburguesa: [40, 8, 25, 2, 900], pizza: [36, 4, 10, 2.5, 640], sandwich: [28, 4, 13, 2, 1100],
  licuado: [45, 35, 8, 3, 120], 'avena-leche': [45, 15, 9, 5, 150], mollete: [55, 4, 14, 9, 1000], 'huevo-frijoles': [12, 1, 15, 4, 450], 'yogur-fruta-granola': [50, 30, 9, 5, 120],
  refresco: [39, 39, 0, 0, 45], jugo: [26, 21, 0.5, 0.5, 2], 'agua-fresca': [25, 24, 0, 0.3, 10], 'cafe-leche': [6, 6, 3.5, 0, 50],
  'pan-dulce': [40, 18, 11, 1, 250], galletas: [22, 10, 6, 0.6, 120], papitas: [24, 0.5, 15, 2, 300], chocolate: [28, 25, 14, 2, 40], helado: [16, 14, 7, 0.5, 50],
  pastelito: [28, 18, 7, 0.5, 150], 'yoplait-natural': [5.7, 5.7, 1.7, 0, 50], 'yoplait-fresa': [14, 13, 2, 0, 70], 'wild-mini': [9, 3, 6, 2, 60],
  'mano-palma': [0, 0, 5, 0, 80], 'mano-carbo': [25, 1, 1, 2, 100], 'mano-verdura': [5, 2, 0.2, 2, 20], 'mano-fruta': [20, 15, 0.3, 2.5, 2], 'mano-grasa': [0, 0, 11, 0, 0],
}

/** Referencias diarias, no metas que regañan. Azúcar: OMS, 10 % de 2000 kcal. Fibra: más es mejor. Sodio: tope sano. */
export const REFERENCIA = { sugar: 50, fiber: 25, sodium: 2300 } as const

export function nutrDe(foodId: string | undefined): Nutr | undefined {
  if (!foodId) return undefined
  const fila = CASEROS[foodId]
  if (fila) return { carbs: fila[0], sugar: fila[1], fat: fila[2], fiber: fila[3], sodium: fila[4] }
  const f = foodById(foodId)
  return f && f.sugar !== undefined ? { carbs: f.carbs ?? 0, sugar: f.sugar, fat: f.fat ?? 0, fiber: f.fiber ?? 0, sodium: f.sodium ?? 0 } : undefined
}

export type NutrDia = Nutr & { conDatos: number; total: number }
export function nutrientesDia(data: AppData, day: string): NutrDia {
  const out: NutrDia = { carbs: 0, sugar: 0, fat: 0, fiber: 0, sodium: 0, conDatos: 0, total: 0 }
  for (const m of data.meals) if (m.day === day) for (const i of m.items) {
    out.total++
    const n = nutrDe(i.foodId)
    if (!n) continue
    out.conDatos++
    out.carbs += n.carbs * i.qty; out.sugar += n.sugar * i.qty; out.fat += n.fat * i.qty; out.fiber += n.fiber * i.qty; out.sodium += n.sodium * i.qty
  }
  const r = (v: number) => Math.round(v * 10) / 10
  return { ...out, carbs: r(out.carbs), sugar: r(out.sugar), fat: r(out.fat), fiber: r(out.fiber), sodium: Math.round(out.sodium) }
}

/** Cuándo festejar la comida del día: la primera vez que llegas a tu meta (o a tu piso si creces). */
export function llegoAMeta(antes: number, ahora: number, meta: number | undefined): boolean {
  return !!meta && meta > 0 && antes < meta && ahora >= meta
}

/** Las metas del día como las muestra Comida: el piso si creces, la meta si eres adulto. */
export function metasComida(data: AppData): { kcal: number; protein: number; crecer: boolean } | null {
  const plan = planFor(data)
  if (plan.mode === 'crecimiento') { const f = (plan as GrowthPlan).floor; return f ? { kcal: f.kcal, protein: f.protein, crecer: true } : null }
  const a = plan as AdultPlan
  return a.kcal && a.protein ? { kcal: a.kcal, protein: a.protein, crecer: false } : null
}
