import { useState } from 'react'
import { dateKey, type AppData, type BodyLog, type MealSlot, type NutritionGoal, type NutritionProfile } from './lib/model'
import { currentWeight, dayTotals, mealTotals, PHASE_LABEL, planFor, shiftDay, SLOT_LABEL, slotFor, type AdultPlan, type GrowthPlan } from './lib/nutrition'
import { FoodLogger, itemLine } from './FoodLogger'
import { Card, Chips, Heading, fmtDay } from './ui'
import { Icon } from './Icons'

type Commit = (update: (d: AppData) => AppData) => void
type Props = { data: AppData; commit: Commit; onMessage: (t: string, undo?: () => void) => void }

export const OPEN_MEAL_KEY = 'bambu.openMeal'

function Meter({ label, value, target, unit = '' }: { label: string; value: number; target: number; unit?: string }) {
  const pct = target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0
  return <div className={`food-meter ${value >= target && target > 0 ? 'full' : ''}`} role="img" aria-label={`${label}: ${value}${unit} de ${target}${unit}`}>
    <div className="food-meter-top"><span>{label}</span><b>{value}{unit}<small> de {target}{unit}</small></b></div>
    <div className="food-meter-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
  </div>
}

function GrowthToday({ data, plan }: { data: AppData; plan: GrowthPlan }) {
  const t = dayTotals(data, dateKey())
  return <Card className="food-today">
    <Meter label="Comidas con proteína" value={t.proteinMeals} target={plan.proteinMealsTarget} />
    <Meter label="Frutas y verduras" value={t.produce} target={plan.produceTarget} />
    {plan.perMealProtein && <p className="food-note">Cada comida con unos {plan.perMealProtein} g de proteína: una palma de carne o pollo, dos huevos con frijoles, o un vaso de leche con yogur.</p>}
    <p className={`food-say ${plan.fuel === 'bajo' ? 'warn' : ''}`}>{plan.message}</p>
  </Card>
}

function AdultToday({ data, plan }: { data: AppData; plan: AdultPlan }) {
  const t = dayTotals(data, dateKey())
  if (!plan.kcal || !plan.protein) return <Card className="food-today"><p className="food-say">{plan.message}</p><p className="food-note">Mientras, registra igual: tus datos sirven desde el primer día.</p></Card>
  const left = plan.kcal - t.kcal
  return <Card className="food-today">
    <Meter label="Calorías" value={t.kcal} target={plan.kcal} />
    <Meter label="Proteína" value={t.protein} target={plan.protein} unit=" g" />
    <p className="food-say">{left >= 0 ? `Te quedan ${left} kcal y ${Math.max(0, plan.protein - t.protein)} g de proteína.` : `Te pasaste ${-left} kcal. Un día no cambia nada; la semana sí.`}</p>
  </Card>
}

function PlanCard({ plan }: { plan: GrowthPlan | AdultPlan }) {
  if (plan.mode === 'crecimiento') return <Card tone="quiet" className="food-plan">
    <h2>Modo crecimiento</h2>
    <p>Tu cuerpo está creciendo y eso ya gasta muchísima energía. A tu edad no hay déficit ni conteo de calorías: hay combustible suficiente, proteína en cada comida y buen sueño. Así se construye el físico que vas a tener toda la vida.</p>
    <p className="food-note">Si comes poco para lo que te mueves, bambú te avisa. Nunca te va a pedir comer menos. Si quieres un plan más fino, que lo arme un nutriólogo con tus papás.</p>
  </Card>
  const rate = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2).replace(/0$/, '')}%`
  return <Card tone="quiet" className="food-plan">
    <h2>{plan.phase ? PHASE_LABEL[plan.phase] : 'Tu plan'}</h2>
    <p>{plan.why}</p>
    {plan.tdee && <ul className="food-facts">
      <li><span>Gasto diario</span><b>{plan.tdee.value} kcal</b><small>{plan.tdee.source === 'formula' ? 'Por fórmula. Con 3 semanas registrando, lo calcula tu cuerpo.' : plan.tdee.source === 'mezcla' ? `Ya lo empieza a calcular tu cuerpo (${plan.tdee.days} días).` : 'Calculado con tus registros y tu peso.'}</small></li>
      <li><span>Ritmo objetivo</span><b>{plan.rate.target === 0 ? 'Peso estable' : `${rate(plan.rate.target)} por semana`}</b><small>{plan.message}</small></li>
      {plan.fatMin && <li><span>Grasa mínima</span><b>{plan.fatMin} g al día</b><small>Por debajo se resienten tus hormonas.</small></li>}
    </ul>}
    {plan.phase === 'definir' && <p className="food-note">Máximo 12 semanas seguidas de definición; luego 2 a 4 de mantenimiento antes de seguir.</p>}
  </Card>
}

function Week({ data, plan }: { data: AppData; plan: GrowthPlan | AdultPlan }) {
  const today = dateKey()
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  return <Card><h2>Tu semana</h2>
    <div className="food-week">{days.map(d => {
      const t = dayTotals(data, d)
      const hit = plan.mode === 'crecimiento' ? t.proteinMeals >= 4 : !!plan.protein && t.protein >= plan.protein * 0.9
      return <div key={d} className={`food-day ${hit ? 'hit' : t.meals ? 'some' : ''} ${d === today ? 'today' : ''}`}>
        <small>{new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' }).format(new Date(`${d}T12:00:00`))}</small>
        <i aria-hidden="true">{hit ? <Icon name="check" size={14} /> : t.meals || ''}</i>
        <span className="sr-only">{fmtDay(d)}: {t.meals} comidas{hit ? ', meta de proteína' : ''}</span>
      </div>
    })}</div>
    <p className="hint">{plan.mode === 'crecimiento' ? 'Palomita: 4 comidas con proteína ese día. El número: comidas registradas.' : 'Palomita: llegaste a tu proteína. El número: comidas registradas.'}</p>
  </Card>
}

function BodyInputs({ data, commit, growth }: { data: AppData; commit: Commit; growth: boolean }) {
  const today = dateKey()
  const n = data.settings.nutrition ?? {}
  const last = (k: 'heightCm' | 'waistCm') => [...data.body].filter(b => b[k]).sort((a, b) => b.day.localeCompare(a.day))[0]?.[k]
  const weight = currentWeight(data, today)
  const [draft, setDraft] = useState({ weight: '', height: '', waist: '' })
  const setN = (patch: NutritionProfile) => commit(d => ({ ...d, settings: { ...d.settings, nutrition: { ...d.settings.nutrition, ...patch } } }))
  const save = () => {
    const w = Number(draft.weight), h = Number(draft.height), c = Number(draft.waist)
    commit(d => {
      const row: BodyLog = { ...(d.body.find(b => b.day === today) ?? { id: today, day: today }) }
      if (w >= 20 && w <= 250) row.weightKg = w
      if (h >= 100 && h <= 230) row.heightCm = h
      if (c >= 40 && c <= 200) row.waistCm = c
      return { ...d, body: [...d.body.filter(b => b.day !== today), row] }
    })
    setDraft({ weight: '', height: '', waist: '' })
  }
  return <Card><h2>Tus medidas</h2>
    <p className="hint">Peso de la mañana, después del baño y antes de desayunar. {growth ? 'La estatura cada mes: estás creciendo.' : 'La cintura a la altura del ombligo, sin meter la panza.'}</p>
    <div className="food-body">
      <label>Peso (kg)<input className="text-input" inputMode="decimal" placeholder={weight ? weight.toFixed(1) : ''} value={draft.weight} onChange={e => setDraft(x => ({ ...x, weight: e.target.value.replace(/[^\d.]/g, '') }))} /></label>
      <label>Estatura (cm)<input className="text-input" inputMode="numeric" placeholder={last('heightCm') ? String(last('heightCm')) : ''} value={draft.height} onChange={e => setDraft(x => ({ ...x, height: e.target.value.replace(/\D/g, '') }))} /></label>
      {!growth && <label>Cintura (cm)<input className="text-input" inputMode="numeric" placeholder={last('waistCm') ? String(last('waistCm')) : ''} value={draft.waist} onChange={e => setDraft(x => ({ ...x, waist: e.target.value.replace(/\D/g, '') }))} /></label>}
    </div>
    <button type="button" className="secondary-button" disabled={!draft.weight && !draft.height && !draft.waist} onClick={save}>Guardar medidas</button>
    <Chips label="Sexo (cambia la fórmula)" value={n.sex} onChange={v => setN({ sex: v })} options={[['h', 'Hombre'], ['m', 'Mujer']]} />
    {!growth && <>
      <Chips label="Tu meta" value={n.goal} onChange={v => setN({ goal: v as NutritionGoal })} options={[['definir', 'Verme más marcado'], ['musculo', 'Más músculo'], ['ambos', 'Las dos'], ['salud', 'Salud y energía']]} />
      <Chips label="Años entrenando fuerza" value={n.trainingYears} onChange={v => setN({ trainingYears: v })} options={[[0, 'Menos de 1'], [1, '1 a 3'], [3, 'Más de 3']]} />
    </>}
  </Card>
}

function Method() {
  return <details className="food-method"><summary>Cómo decide bambú</summary>
    <ol>
      <li><b>Mide.</b> Lo que comes en segundos y tu peso de la mañana. El promedio de la semana manda, no el día.</li>
      <li><b>Decide.</b> La fase sale de tu cintura entre tu estatura, tus años entrenando y tu meta. El somatotipo (ecto, meso, endo) no tiene estudios que lo liguen a una dieta.</li>
      <li><b>Calibra.</b> Arranca con la fórmula de Mifflin-St Jeor. Con tres semanas de registros, tu gasto real sale de lo que comiste y lo que cambió tu peso.</li>
      <li><b>Ajusta.</b> Cada semana contra un ritmo con evidencia: definir 0.5 a 1% del peso por semana, ganar 0.25 a 0.5%, proteína de 1.6 a 2.2 g por kilo.</li>
    </ol>
    <p className="hint">Fuentes: Helms 2014 y Iraki 2019 (ritmos), Morton 2018 (proteína), Frankenfield 2005 (fórmula), Barakat 2020 (recomposición), Ashwell 2012 (cintura), AAP 2016 (adolescentes sin dietas).</p>
  </details>
}

export function FoodPage({ data, commit, onMessage }: Props) {
  const plan = planFor(data)
  const growth = plan.mode === 'crecimiento'
  const today = dateKey()
  const [open, setOpen] = useState<MealSlot | null>(() => { try { if (sessionStorage.getItem(OPEN_MEAL_KEY)) { sessionStorage.removeItem(OPEN_MEAL_KEY); return slotFor(new Date().getHours()) } } catch { /* sin sesión, abre cerrado */ } return null })
  const meals = data.meals.filter(m => m.day === today).sort((a, b) => a.at - b.at)
  const now = slotFor(new Date().getHours())
  const remove = (id: string) => {
    const meal = data.meals.find(m => m.id === id)
    commit(d => ({ ...d, meals: d.meals.filter(m => m.id !== id) }))
    if (meal) onMessage('Comida borrada.', () => commit(d => ({ ...d, meals: [...d.meals, meal] })))
  }
  return <>
    <Heading eyebrow={growth ? 'MODO CRECIMIENTO' : 'MÉTODO BAMBÚ'} title="Comida" text={growth ? 'Combustible para crecer y jugar. Registra en segundos, sin contar calorías.' : 'Lo que no se mide no se mejora. Registra en segundos; el plan se ajusta solo.'} />
    <button type="button" className="food-big" onClick={() => setOpen(now)}><Icon name="mas-grande" size={26} /><span><strong>Registrar {SLOT_LABEL[now].toLowerCase()}</strong><small>Lo de siempre en un toque</small></span></button>
    {growth ? <GrowthToday data={data} plan={plan as GrowthPlan} /> : <AdultToday data={data} plan={plan as AdultPlan} />}
    {meals.length > 0 && <Card><h2>Hoy</h2><ul className="food-list">{meals.map(m => {
      const t = mealTotals(m)
      return <li key={m.id}><span><strong>{SLOT_LABEL[m.slot]}</strong><small>{m.items.map(i => i.name.toLowerCase()).join(', ')}</small></span>
        <em>{itemLine({ ...m.items[0], kcal: t.kcal, protein: t.protein }, growth)}</em>
        <button type="button" className="quiet-button" aria-label={`Borrar ${SLOT_LABEL[m.slot].toLowerCase()}`} onClick={() => remove(m.id)}><Icon name="cerrar" size={16} /></button></li>
    })}</ul></Card>}
    <Week data={data} plan={plan} />
    <PlanCard plan={plan} />
    <BodyInputs data={data} commit={commit} growth={growth} />
    <Method />
    {open && <FoodLogger data={data} commit={commit} slot={open} growth={growth} onClose={() => setOpen(null)} onMessage={onMessage} />}
  </>
}
