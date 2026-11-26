import type { AppData, HabitDef } from './model'

export const BED_MORNING: HabitDef = { id: 'cama', label: 'Tender la cama', mark: 'T', when: 'manana' }
export const PHONE_MORNING: HabitDef = { id: 'tel-hora', label: 'Una hora sin teléfono al despertar', mark: 'U', when: 'manana' }
const SLEEP = /dormir|pantalla|desvel/i
const BED = /cama/i
const PHONE = /tel[eé]fono|celular/i

function rank(h: HabitDef): number {
  if (/a mi hora|dormir/i.test(h.label) && !/pantalla/i.test(h.label)) return 0
  if (SLEEP.test(h.label)) return 1
  if (BED.test(h.label) || h.id === 'cama') return 2
  if (PHONE.test(h.label)) return 3
  return 4
}

export function setupMorning(data: AppData): AppData {
  let habits = data.settings.habits.map(h => !h.archived && (SLEEP.test(h.label) || BED.test(h.label) || h.id === 'cama' || PHONE.test(h.label)) ? { ...h, when: 'manana' as const } : h)
  if (!habits.some(h => !h.archived && (h.id === 'cama' || BED.test(h.label)))) habits = [...habits.filter(h => h.id !== 'cama'), BED_MORNING]
  if (!habits.some(h => !h.archived && PHONE.test(h.label))) habits = [...habits.filter(h => h.id !== PHONE_MORNING.id), PHONE_MORNING]
  return { ...data, settings: { ...data.settings, habits, morningSetup: true } }
}

export function morningHabits(data: AppData): HabitDef[] {
  return data.settings.habits.filter(h => !h.archived && h.when === 'manana').sort((a, b) => rank(a) - rank(b))
}

export function morningQuestion(h: HabitDef): string {
  if (/a mi hora/i.test(h.label)) return '¿Dormiste a tu hora?'
  if (/pantalla/i.test(h.label)) return '¿Dejaste las pantallas antes de dormir?'
  if (BED.test(h.label) || h.id === 'cama') return '¿Tendiste tu cama?'
  if (PHONE.test(h.label)) return '¿Esperaste una hora antes de usar el teléfono?'
  return `¿${h.label}?`
}
