/**
 * El método bambú para la comida: MIDE, DECIDE, CALIBRA, AJUSTA.
 *
 * 1. Mide: lo que comes (en segundos) y tu peso de la mañana. Nada más.
 * 2. Decide la fase con datos, no con tu "somatotipo" (no hay estudios que liguen ecto, meso o endo
 *    con una dieta): cintura entre estatura, años entrenando y tu meta.
 * 3. Calibra: arranca con la fórmula de Mifflin-St Jeor (la que más veces cae a menos de 10% de lo
 *    medido, Frankenfield 2005) y, con dos o tres semanas de registros, la reemplaza tu propio cuerpo:
 *    gasto = lo que comiste menos lo que cambió tu peso (7700 kcal por kilo).
 * 4. Ajusta cada semana contra un ritmo con evidencia: definir 0.5 a 1% del peso por semana
 *    (Helms 2014), ganar 0.25 a 0.5% (Iraki 2019), recomponer en mantenimiento (Barakat 2020).
 *    Proteína 1.6 a 2.2 g/kg (Morton 2018).
 *
 * Menores de 18: MODO CRECIMIENTO. Sin metas de calorías ni déficit (la AAP pide no poner a dieta
 * a adolescentes: el conteo y la dieta suben el riesgo de atracones y de trastornos). Se mide lo que
 * construye: comidas con proteína, frutas y verduras, y que el combustible alcance para crecer y
 * jugar. Si come de menos, se le dice; si come "de más", no.
 */
import type { AppData, Meal, MealSlot, NutritionGoal } from './model'
import { dateKey } from './model'

export const PROTEIN_MEAL_G = 12
export const KCAL_PER_KG = 7700
const DAY = 86400000

export function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + days); return dateKey(d)
}
export function slotFor(hour: number): MealSlot {
  return hour < 11 ? 'desayuno' : hour < 17 ? 'comida' : hour < 22 ? 'cena' : 'colacion'
}
export const SLOT_LABEL: Record<MealSlot, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', colacion: 'Colación' }

export function mealTotals(meal: Meal): { kcal: number; protein: number } {
  return meal.items.reduce((t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.protein }), { kcal: 0, protein: 0 })
}

export type DayTotals = { kcal: number; protein: number; meals: number; proteinMeals: number; produce: number; sweets: number }
export function dayTotals(data: AppData, day: string): DayTotals {
  const meals = data.meals.filter(m => m.day === day)
  const out: DayTotals = { kcal: 0, protein: 0, meals: meals.length, proteinMeals: 0, produce: 0, sweets: 0 }
  for (const m of meals) {
    const t = mealTotals(m)
    out.kcal += t.kcal; out.protein += t.protein
    if (t.protein >= PROTEIN_MEAL_G) out.proteinMeals++
    for (const i of m.items) {
      if (i.group === 'verdura' || i.group === 'fruta') out.produce += i.qty
      if (i.group === 'dulce' || i.group === 'bebida' && i.protein < 1) out.sweets += i.qty
    }
  }
  out.protein = Math.round(out.protein)
  out.produce = Math.round(out.produce * 2) / 2
  return out
}

/** Comidas con proteína del día: lo registrado manda; si no registraste comidas, vale lo del check-in. */
export function proteinMealsOn(data: AppData, day: string): number | undefined {
  if (data.meals.some(m => m.day === day)) return dayTotals(data, day).proteinMeals
  return data.checkins.find(c => c.day === day)?.proteinMeals
}

/** Comidas que más repites (por nombre de los alimentos), para registrar en un toque. */
export function frequentMeals(data: AppData, limit = 6, slot?: MealSlot): Meal[] {
  const seen = new Map<string, { meal: Meal; n: number; last: number }>()
  for (const m of data.meals) {
    const key = m.items.map(i => `${i.qty}x${i.name}`).sort().join('|')
    const prev = seen.get(key)
    const bonus = slot && m.slot === slot ? 2 : 1
    seen.set(key, { meal: !prev || m.at > prev.last ? m : prev.meal, n: (prev?.n ?? 0) + bonus, last: Math.max(prev?.last ?? 0, m.at) })
  }
  return [...seen.values()].sort((a, b) => b.n - a.n || b.last - a.last).slice(0, limit).map(x => x.meal)
}

// ── Cuerpo ───────────────────────────────────────────────────────────────
function latest(data: AppData, key: 'heightCm' | 'waistCm' | 'weightKg'): number | undefined {
  return [...data.body].filter(b => b[key]).sort((a, b) => b.day.localeCompare(a.day))[0]?.[key]
}
/** Peso de hoy: promedio de los últimos 7 días (un solo día engaña por agua y sal). */
export function currentWeight(data: AppData, today: string): number | undefined {
  const week = data.body.filter(b => b.weightKg && b.day > shiftDay(today, -7) && b.day <= today).map(b => b.weightKg!)
  return week.length ? week.reduce((a, b) => a + b, 0) / week.length : latest(data, 'weightKg')
}
/** Mifflin-St Jeor. */
export function mifflin(sex: 'h' | 'm', kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'h' ? 5 : -161)
}
/** Días con entreno de fuerza o fútbol por semana, de las últimas dos semanas. */
export function sessionsPerWeek(data: AppData, today: string): number {
  const from = shiftDay(today, -14)
  const days = new Set([...data.sets.map(s => s.day), ...data.activities.filter(a => a.kind === 'football').map(a => a.day)].filter(d => d > from && d <= today))
  return days.size / 2
}
export function activityFactor(perWeek: number): number {
  return Math.min(1.85, 1.35 + 0.075 * perWeek)
}

/** Pendiente del peso en kg por día (mínimos cuadrados). null si hay pocos datos. */
export function weightSlope(data: AppData, from: string, to: string): number | null {
  const pts = data.body.filter(b => b.weightKg && b.day > from && b.day <= to).map(b => ({ x: (Date.parse(`${b.day}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / DAY, y: b.weightKg! }))
  if (pts.length < 4) return null
  const span = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x))
  if (span < 10) return null
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length
  const num = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0)
  return den ? num / den : null
}

export type Tdee = { value: number; formula: number; observed: number | null; days: number; source: 'formula' | 'mezcla' | 'tu-cuerpo' }
/**
 * Gasto diario. Con 10 o más días bien registrados en las últimas 4 semanas y peso suficiente, tu
 * cuerpo empieza a pesar más que la fórmula; con 21 días manda él. Un día "bien registrado" tiene
 * al menos dos comidas y 800 kcal (si no, faltan cosas y el cálculo mentiría).
 */
export function tdeeOf(data: AppData, today: string, formula: number): Tdee {
  const from = shiftDay(today, -28), to = shiftDay(today, -1)
  const days = [...new Set(data.meals.filter(m => m.day > from && m.day <= to).map(m => m.day))]
    .map(d => dayTotals(data, d)).filter(t => t.meals >= 2 && t.kcal >= 800)
  const slope = weightSlope(data, from, today)
  if (days.length < 10 || slope === null) return { value: Math.round(formula), formula: Math.round(formula), observed: null, days: days.length, source: 'formula' }
  const intake = days.reduce((a, t) => a + t.kcal, 0) / days.length
  const observed = intake - slope * KCAL_PER_KG
  // Fuera de 60% a 160% de la fórmula casi siempre es registro incompleto, no metabolismo raro.
  if (observed < formula * 0.6 || observed > formula * 1.6) return { value: Math.round(formula), formula: Math.round(formula), observed: Math.round(observed), days: days.length, source: 'formula' }
  const w = Math.min(1, days.length / 21)
  return { value: Math.round(w * observed + (1 - w) * formula), formula: Math.round(formula), observed: Math.round(observed), days: days.length, source: w >= 1 ? 'tu-cuerpo' : 'mezcla' }
}

// ── Decidir la fase ──────────────────────────────────────────────────────
export type Phase = 'definir' | 'ganar' | 'recomponer' | 'mantener'
export const PHASE_LABEL: Record<Phase, string> = { definir: 'Definición', ganar: 'Volumen limpio', recomponer: 'Recomposición', mantener: 'Mantenimiento' }
/** Ritmo semanal objetivo como fracción del peso (negativo = bajar). */
export const PHASE_RATE: Record<Phase, { target: number; low: number; high: number }> = {
  definir: { target: -0.0075, low: -0.01, high: -0.005 },
  ganar: { target: 0.0035, low: 0.0025, high: 0.005 },
  recomponer: { target: 0, low: -0.0025, high: 0.0025 },
  mantener: { target: 0, low: -0.0025, high: 0.0025 },
}

/**
 * Cintura entre estatura: menos de 0.5 es la recomendación de salud (Ashwell 2012; NICE la adoptó en
 * 2022). Sirve de termómetro de grasa sin básculas caras. Reglas:
 *  - 0.5 o más: definir (la salud va primero), salvo principiante con meta de músculo y menos de 0.55: recomponer.
 *  - Principiante (menos de 1 año) entre 0.45 y 0.5: recomponer. Gana músculo sin subir de peso.
 *  - Menos de 0.45 con meta de músculo o ambas: volumen limpio.
 *  - Ya magro (menos de 0.42) pidiendo definir: mantener. Definir más ahí cuesta músculo y ánimo.
 */
export function decidePhase(goal: NutritionGoal | undefined, whtr: number | undefined, years: number | undefined): { phase: Phase; why: string } {
  const novice = (years ?? 0) < 1
  if (whtr === undefined) {
    const phase: Phase = goal === 'definir' ? 'definir' : goal === 'musculo' ? 'ganar' : goal === 'ambos' ? 'recomponer' : 'mantener'
    return { phase, why: 'Por ahora sale de tu meta. Mide tu cintura y el plan se decide con tu cuerpo.' }
  }
  const r = whtr.toFixed(2)
  if (whtr >= 0.5) {
    if (novice && goal === 'musculo' && whtr < 0.55) return { phase: 'recomponer', why: `Tu cintura es ${r} de tu estatura y apenas empiezas: puedes ganar músculo y perder grasa a la vez si comes en mantenimiento y entrenas duro.` }
    return { phase: 'definir', why: `Tu cintura es ${r} de tu estatura; lo sano es menos de 0.5. Primero baja grasa, despacio, para no perder músculo.` }
  }
  if (goal === 'definir' && whtr < 0.42) return { phase: 'mantener', why: `Ya estás magro (${r}). Bajar más te costaría músculo y energía. Mejor mantén y gana fuerza.` }
  if (goal === 'definir') return { phase: 'definir', why: `Estás en zona sana (${r}) y quieres verte más marcado: una definición corta y suave.` }
  if (novice && whtr >= 0.45) return { phase: 'recomponer', why: `Empiezas y estás en ${r}: con proteína alta y entreno, ganas músculo sin subir de peso.` }
  if (goal === 'musculo' || goal === 'ambos') return { phase: 'ganar', why: `Estás magro (${r}): tienes espacio para un volumen limpio, subiendo poquito cada semana.` }
  return { phase: 'mantener', why: `Estás en zona sana (${r}). Mantén tu peso y deja que el entreno cambie tu cuerpo.` }
}

// ── El plan ──────────────────────────────────────────────────────────────
export type GrowthPlan = {
  mode: 'crecimiento'; proteinMealsTarget: number; produceTarget: number; perMealProtein: number | null
  fuel: 'bajo' | 'bien' | 'sin-datos'; message: string
}
export type AdultPlan = {
  mode: 'adulto'; missing: string[]; phase: Phase | null; why: string
  kcal: number | null; protein: number | null; fatMin: number | null; tdee: Tdee | null
  rate: { target: number; actual: number | null; status: 'sin-datos' | 'en-ritmo' | 'lento' | 'rapido' }
  message: string
}
export type Plan = GrowthPlan | AdultPlan

export function planFor(data: AppData, now = Date.now()): Plan {
  const today = dateKey(new Date(now))
  const age = data.settings.age
  const weight = currentWeight(data, today)
  const height = latest(data, 'heightCm')
  return age < 18 ? growthPlan(data, today, weight, height) : adultPlan(data, today, weight, height)
}

function growthPlan(data: AppData, today: string, weight: number | undefined, height: number | undefined): GrowthPlan {
  const t = dayTotals(data, today)
  const perMealProtein = weight ? Math.round(weight * 0.3) : null
  // Combustible: solo se juzga un día ya cerrado y bien registrado (3 comidas o más). Ecuación de
  // gasto en reposo para adolescentes deportistas (11.1 kg + 8.4 cm - 340 hombres, 537 mujeres).
  let fuel: GrowthPlan['fuel'] = 'sin-datos'
  const yesterday = shiftDay(today, -1)
  const y = dayTotals(data, yesterday)
  if (weight && height && y.meals >= 3) {
    const rest = 11.1 * weight + 8.4 * height - (data.settings.nutrition?.sex === 'm' ? 537 : 340)
    const active = data.sets.some(s => s.day === yesterday) || data.activities.some(a => a.day === yesterday && a.kind === 'football')
    fuel = y.kcal < rest * (active ? 1.75 : 1.55) * 0.75 ? 'bajo' : 'bien'
  }
  const left = Math.max(0, 4 - t.proteinMeals)
  const message = fuel === 'bajo'
    ? 'Ayer comiste poco para todo lo que te mueves. Tu cuerpo está creciendo: hoy suma una comida o un licuado.'
    : t.meals === 0 ? 'Registra tu primera comida del día. Un toque y cuenta.'
      : left === 0 ? 'Cuatro comidas con proteína. Eso es lo que construye músculo a tu edad.'
        : `Te ${left === 1 ? 'falta 1 comida' : `faltan ${left} comidas`} con proteína. Huevo, pollo, frijoles, leche o yogur.`
  return { mode: 'crecimiento', proteinMealsTarget: 4, produceTarget: 5, perMealProtein, fuel, message }
}

function adultPlan(data: AppData, today: string, weight: number | undefined, height: number | undefined): AdultPlan {
  const n = data.settings.nutrition ?? {}
  const missing = [!n.sex && 'sexo', !height && 'estatura', !weight && 'peso', !n.goal && 'meta'].filter((x): x is string => !!x)
  const waist = latest(data, 'waistCm')
  const { phase, why } = decidePhase(n.goal, waist && height ? waist / height : undefined, n.trainingYears)
  const empty: AdultPlan = { mode: 'adulto', missing, phase: missing.length ? null : phase, why, kcal: null, protein: null, fatMin: null, tdee: null, rate: { target: PHASE_RATE[phase].target, actual: null, status: 'sin-datos' }, message: `Para armar tu plan me falta: ${missing.join(', ')}.` }
  if (!n.sex || !height || !weight) return empty
  const bmr = mifflin(n.sex, weight, height, data.settings.age)
  const tdee = tdeeOf(data, today, bmr * activityFactor(sessionsPerWeek(data, today)))
  const rate = PHASE_RATE[phase]
  const delta = rate.target * weight * KCAL_PER_KG / 7
  // Pisos: nunca menos que tu gasto en reposo ni un déficit de más de 25%.
  const kcal = Math.round(Math.max(delta, -0.25 * tdee.value) + tdee.value)
  const floor = Math.max(Math.round(bmr), n.sex === 'h' ? 1500 : 1200)
  // Con mucha grasa, la proteína se calcula sobre un peso de referencia (IMC 25), no el total.
  const refWeight = waist && waist / height >= 0.55 ? Math.min(weight, 25 * (height / 100) ** 2) : weight
  const protein = Math.round(refWeight * (phase === 'definir' ? 2.2 : 1.8))
  const slope = weightSlope(data, shiftDay(today, -14), today)
  const actual = slope === null ? null : slope * 7 / weight
  const hold = rate.target === 0
  const status: AdultPlan['rate']['status'] = actual === null ? 'sin-datos' : actual >= rate.low && actual <= rate.high ? 'en-ritmo'
    : hold ? 'rapido' : (actual < rate.low) === (rate.target < 0) ? 'rapido' : 'lento'
  // Sin registros suficientes para que el cuerpo calibre, el ajuste es a mano: 150 kcal por semana fuera de ritmo.
  const nudge = tdee.source !== 'formula' || actual === null || status === 'en-ritmo' ? 0 : Math.sign((rate.target - actual) || 0) * 150
  const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
  const message = status === 'sin-datos' ? 'Pésate 3 a 5 mañanas por semana. Con dos semanas veo tu ritmo real.'
    : status === 'en-ritmo' ? `Vas en ${pct(actual!)} por semana, justo en el ritmo. No cambies nada.`
      : hold ? `Tu peso se mueve ${pct(actual!)} por semana y en esta fase debe quedarse quieto. Tu objetivo ya se ajustó.`
        : status === 'rapido' ? `Vas en ${pct(actual!)} por semana, más rápido de lo sano. Tu objetivo ya se ajustó.`
          : `Vas en ${pct(actual!)} por semana, más lento de lo planeado. Revisa que registres todo; tu objetivo ya se ajustó.`
  return { ...empty, kcal: Math.max(kcal + nudge, floor), protein, fatMin: Math.round(weight * 0.6), tdee, rate: { target: rate.target, actual, status }, message }
}
