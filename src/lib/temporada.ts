import type { AppData } from './model'
import { noteOf, strikeSet, track, type Battle, type Extra, type Monster, type Scene } from './aventura'

export const SEASON_TAG = 'temporada:'
type Def = { name: string; scene: Scene; monsters: [string, string, string, Extra][] }
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DEFS: Def[] = [
  { name: 'Cuesta de enero', scene: 'nieve', monsters: [['Propositón', 'Promete y no cumple', 'Piernas', 'none'], ['Gym Fantasma', 'Tu membresía sin usar', 'Espalda', 'gorro'], ['Roscón', 'Rosca de Reyes con patas', 'Abdomen', 'none'], ['Cuesta de Enero', 'Jefe: la subida más larga', 'Cardio', 'corona']] },
  { name: 'Corazones flojos', scene: 'ciudad', monsters: [['Chocolatón', 'Derretido en el sillón', 'Pecho', 'none'], ['Cupido Flojo', 'Dispara flechas de siesta', 'Hombros', 'alas'], ['Serenatón', 'Te canta para que no te levantes', 'Piernas', 'sombrero'], ['Corazón de Pizza', 'Jefe: queso extra de pereza', 'Abdomen', 'corona']] },
  { name: 'Jacarandas', scene: 'bosque', monsters: [['Polenón', 'Estornudos de flojera', 'Cardio', 'antenas'], ['Abeja Siesta', 'Zumba "cinco minutos más"', 'Hombros', 'alas'], ['Estornudo Gigante', 'Achú y se acabó el día', 'Pecho', 'none'], ['Jacarandón', 'Jefe: florece en tu sillón', 'Espalda', 'corona']] },
  { name: 'Vacaciones eternas', scene: 'fiesta', monsters: [['Hamacón', 'Se mece todo el día', 'Abdomen', 'none'], ['Flotador Flojo', 'Nunca se hunde, nunca se mueve', 'Piernas', 'none'], ['Bloqueador Pegajoso', 'Te pega al camastro', 'Pecho', 'gorro'], ['Rey Puente Largo', 'Jefe: vacaciones sin fin', 'Espalda', 'corona']] },
  { name: 'Calor del demonio', scene: 'volcan', monsters: [['Solazo', 'Derrite tus ganas', 'Cardio', 'none'], ['Paletón', 'Paleta derretida con dientes', 'Pecho', 'antenas'], ['Ventilador Roto', 'Sopla flojera caliente', 'Hombros', 'alas'], ['Ola de Calor', 'Jefe: 35 grados de pereza', 'Piernas', 'corona']] },
  { name: 'Temporal', scene: 'tormenta', monsters: [['Charcotón', 'Te moja los tenis', 'Piernas', 'none'], ['Paraguas Roto', 'Excusa perfecta para no salir', 'Espalda', 'antenas'], ['Trueno Dormilón', 'Ruge y se vuelve a dormir', 'Abdomen', 'zzz'], ['Tormentón Tapatío', 'Jefe: inunda Guadalajara', 'Cardio', 'corona']] },
  { name: 'Maratón de series', scene: 'pantalla', monsters: [['Siguiente Episodio', 'Empieza en 5, 4, 3...', 'Pecho', 'antenas'], ['Control Perdido', 'Nunca lo encuentras', 'Abdomen', 'none'], ['Wifi Lento', 'Carga tu flojera', 'Hombros', 'antenas'], ['Kraken del Maratón', 'Jefe: diez temporadas seguidas', 'Espalda', 'corona']] },
  { name: 'Regreso a clases', scene: 'ciudad', monsters: [['Mochilón', 'Pesa como tu flojera', 'Espalda', 'none'], ['Lápiz Mordido', 'Ansioso y quieto', 'Hombros', 'antenas'], ['Tarea Zombie', 'Nunca se termina', 'Piernas', 'gorro'], ['Lunes Eterno', 'Jefe: no se acaba nunca', 'Abdomen', 'corona']] },
  { name: 'Mes patrio', scene: 'fiesta', monsters: [['Pozolón', 'Plato hondo de siesta', 'Abdomen', 'none'], ['Tostadón', 'Crujiente y flojo', 'Pecho', 'antenas'], ['Cohetón', 'Hace ruido y no despega', 'Cardio', 'none'], ['Antojón Patrio', 'Jefe: ¡viva la flojera!', 'Piernas', 'sombrero']] },
  { name: 'Noche de miedo', scene: 'bosque', monsters: [['Calabazón', 'Hueco por dentro', 'Piernas', 'none'], ['Sábana Fantasma', 'No sale de la cama', 'Espalda', 'none'], ['Murciélago Scroll', 'Vuela de video en video', 'Hombros', 'alas'], ['Momia Desvelada', 'Jefe: vendada de flojera', 'Abdomen', 'corona']] },
  { name: 'Día de Muertos', scene: 'fiesta', monsters: [['Calaverita Floja', 'Ni para el verso se levanta', 'Piernas', 'none'], ['Pan de Muerto Gigante', 'Azúcar y siesta', 'Abdomen', 'gorro'], ['Catrín Dormilón', 'Elegante y acostado', 'Hombros', 'sombrero'], ['Ofrendón', 'Jefe: se come tu energía', 'Espalda', 'corona']] },
  { name: 'Posadas sin fin', scene: 'nieve', monsters: [['Tamalón', 'Envuelto en hoja de flojera', 'Abdomen', 'none'], ['Ponche Hirviente', 'Te calienta para no salir', 'Cardio', 'antenas'], ['Piñata Rebelde', 'No se rompe ni a palos', 'Pecho', 'gorro'], ['Recalentado Eterno', 'Jefe: sobras hasta enero', 'Espalda', 'corona']] },
]
const HP = [60, 90, 120, 180]
const XP = [30, 30, 30, 80]
export const SEASON_DODGE = [1, 3, 5, 8]

export type Season = { id: string; name: string; month: string; year: string; scene: Scene; monsters: Monster[] }
export function seasonInfo(id: string): Season {
  const [year, mm] = id.split('-')
  const m = Number(mm) - 1
  const def = DEFS[m]
  return {
    id, name: def.name, month: MONTHS[m], year, scene: def.scene,
    monsters: def.monsters.map(([name, title, weak, extra], k) => ({ id: 100 + m * 10 + k, name, title, weak, extra, hp: HP[k], xp: XP[k], scene: def.scene, color: `m${(m * 3 + k * 2) % 10}`, horns: k === 3 ? 2 : extra === 'none' ? k % 2 : 0, eyes: [2, 1, 3, 2][k] })),
  }
}
export const seasonIdOf = (day: string) => day.slice(0, 7)
export function daysLeft(day: string): number {
  const d = new Date(`${day}T12:00:00`)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
}

export type SeasonState = Season & { battles: Battle[]; current: number; daysLeft: number; done: boolean }
export function season(data: AppData, day: string, id = seasonIdOf(day)): SeasonState {
  const info = seasonInfo(id)
  const t = track(data, info.monsters, `${SEASON_TAG}${id}:`)
  return { ...info, ...t, daysLeft: id === seasonIdOf(day) ? daysLeft(day) : 0, done: t.current >= info.monsters.length }
}
export function seasonAttack(data: AppData, day: string, index: number, exercise: string, kind: 'reps' | 'seconds', value: number, now = Date.now(), dodged = 0): AppData {
  return strikeSet(data, day, noteOf(`${SEASON_TAG}${seasonIdOf(day)}:`, index, dodged), exercise, kind, value, now)
}
export function seasonsPlayed(data: AppData): string[] {
  return [...new Set(data.sets.filter(s => s.note?.startsWith(SEASON_TAG)).map(s => s.note!.slice(SEASON_TAG.length, SEASON_TAG.length + 7)))].filter(id => /^\d{4}-\d{2}$/.test(id)).sort()
}
export function seasonXpOn(data: AppData, day: string): number {
  return season(data, day).battles.filter(b => b.defeatedDay === day).reduce((a, b) => a + b.monster.xp, 0)
}
