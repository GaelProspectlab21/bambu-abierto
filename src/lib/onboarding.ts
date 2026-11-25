import type { HabitDef, Modules } from './model'
export const FIRST_STEPS = [
  { id: 'agua', label: 'Tomar agua', mark: 'A', instruction: 'Ve por agua y toma unos sorbos. Yo te espero aquí.' },
  { id: 'orden', label: 'Ordenar una cosa', mark: 'O', instruction: 'Pon una cosa en su lugar. Un libro o tu mochila bastan.' },
  { id: 'gratitud', label: 'Escribir una gratitud', mark: 'G', instruction: 'En papel, escribe algo que agradeces de hoy.' },
] as const
export type OnboardingResult = { name: string; north: string; modules: Modules; habits: HabitDef[]; age: number; footballDays: number[]; weeklyFocusGoal?: number; firstVotes: string[]; trainingLevel?: number; equipment?: string[] }
export function onboardingResult(name: string, age: number, modules: Modules, chosen: string, done: boolean): OnboardingResult {
  const action = FIRST_STEPS.find(a => a.id === chosen) ?? FIRST_STEPS[0]
  return { name: name.trim().slice(0, 40), age: Math.min(99, Math.max(8, Math.round(age))), north: '',
    modules: { ...modules, reading: modules.reading || modules.bible },
    habits: [{ id: action.id, label: action.label, mark: action.mark }], footballDays: [],
    trainingLevel: 1, equipment: ['nada', 'pared'], firstVotes: done ? [action.id] : [] }
}
