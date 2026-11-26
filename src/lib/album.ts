import { dateKey, type AppData } from './model'
import { adventure, type Monster } from './aventura'
import { season, seasonIdOf, seasonsPlayed } from './temporada'
import { clearedDays } from './mazmorra'
import { recordTable } from './libre'
import { gardenStats } from './jardin'
import { levelOf, totalXp } from './xp'
import { weeklyBoss } from './jefe'

export type Rarity = 'comun' | 'rara' | 'epica' | 'legendaria'
export const RARITY: Record<Rarity, string> = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria' }
export type CardIcon = 'pesa' | 'fuego' | 'reloj' | 'estrella' | 'caminar' | 'rayo' | 'bici' | 'cofre' | 'libro' | 'planta' | 'escudo'
export type Card = { id: string; name: string; text: string; rarity: Rarity; kind: 'Monstruos' | 'Hazañas' | 'Temporada'; monster?: Monster; icon?: CardIcon; earned: boolean; day?: string }

type Ctx = { bosses: number; best: (re: RegExp) => number; dayReps: number; streak: number; km: Record<string, number>; dungeons: number; records: number; readDays: number; level: number; sets: number }
const FEATS: { id: string; name: string; text: string; rarity: Rarity; icon: CardIcon; ok: (c: Ctx) => boolean }[] = [
  { id: 'primera', name: 'Primer paso', text: 'Tu primera serie', rarity: 'comun', icon: 'pesa', ok: c => c.sets > 0 },
  { id: 'plancha60', name: 'Tabla', text: 'Plancha de 1 minuto', rarity: 'comun', icon: 'reloj', ok: c => c.best(/^plancha$/) >= 60 },
  { id: 'caminante', name: 'Caminante', text: '10 km caminados en total', rarity: 'comun', icon: 'caminar', ok: c => c.km.caminar >= 10 },
  { id: 'mazmorra1', name: 'Explorador', text: 'Tu primera mazmorra', rarity: 'comun', icon: 'cofre', ok: c => c.dungeons >= 1 },
  { id: 'cien', name: 'Cien en un día', text: '100 repeticiones en un solo día', rarity: 'rara', icon: 'fuego', ok: c => c.dayReps >= 100 },
  { id: 'lagartijas30', name: 'Pecho de acero', text: '30 lagartijas en una serie', rarity: 'rara', icon: 'pesa', ok: c => c.best(/^lagartijas/) >= 30 },
  { id: 'wallsit120', name: 'Silla invisible', text: 'Wall sit de 2 minutos', rarity: 'rara', icon: 'reloj', ok: c => c.best(/^wall sit$/) >= 120 },
  { id: 'pistol', name: 'Una sola pierna', text: 'Una pistol squat completa', rarity: 'rara', icon: 'estrella', ok: c => c.best(/^pistol squat$/) >= 1 },
  { id: 'racha7', name: 'Semana de fuego', text: 'Racha de 7 días', rarity: 'rara', icon: 'fuego', ok: c => c.streak >= 7 },
  { id: 'mazmorra7', name: 'Cazador de tesoros', text: '7 mazmorras superadas', rarity: 'rara', icon: 'cofre', ok: c => c.dungeons >= 7 },
  { id: 'records10', name: 'Coleccionista', text: 'Récord en 10 ejercicios distintos', rarity: 'rara', icon: 'estrella', ok: c => c.records >= 10 },
  { id: 'lector', name: 'Ratón de biblioteca', text: 'Leíste 10 días', rarity: 'rara', icon: 'libro', ok: c => c.readDays >= 10 },
  { id: 'jefe1', name: 'Cazajefes', text: 'Vence a un jefe de la semana', rarity: 'rara', icon: 'escudo', ok: c => c.bosses >= 1 },
  { id: 'rango12', name: 'Bambú joven', text: 'Llega al nivel 12', rarity: 'rara', icon: 'planta', ok: c => c.level >= 12 },
  { id: 'dominadas10', name: 'Rey de la barra', text: '10 dominadas en una serie', rarity: 'epica', icon: 'pesa', ok: c => c.best(/^(dominadas|chin ups)/) >= 10 },
  { id: 'plancha180', name: 'Roca', text: 'Plancha de 3 minutos', rarity: 'epica', icon: 'reloj', ok: c => c.best(/^plancha$/) >= 180 },
  { id: 'hspu', name: 'De cabeza', text: 'Un handstand push up', rarity: 'epica', icon: 'estrella', ok: c => c.best(/^handstand push up/) >= 1 },
  { id: 'racha30', name: 'Mes imparable', text: 'Racha de 30 días', rarity: 'epica', icon: 'fuego', ok: c => c.streak >= 30 },
  { id: 'maraton', name: 'Maratonista', text: '42 km corriendo en total', rarity: 'epica', icon: 'rayo', ok: c => c.km.correr >= 42.2 },
  { id: 'ciclista', name: 'Ciclista', text: '100 km en bici en total', rarity: 'epica', icon: 'bici', ok: c => c.km.bici >= 100 },
  { id: 'mazmorra30', name: 'Señor de la mazmorra', text: '30 mazmorras superadas', rarity: 'epica', icon: 'cofre', ok: c => c.dungeons >= 30 },
  { id: 'jefe4', name: 'Mes sin jefes', text: 'Vence a 4 jefes de la semana', rarity: 'epica', icon: 'escudo', ok: c => c.bosses >= 4 },
  { id: 'rango24', name: 'Bosque', text: 'Llega al nivel 24', rarity: 'epica', icon: 'planta', ok: c => c.level >= 24 },
  { id: 'muscleup', name: 'Muscle up', text: 'Tu primer muscle up', rarity: 'legendaria', icon: 'estrella', ok: c => c.best(/^muscle up$/) >= 1 },
  { id: 'racha100', name: 'Leyenda viva', text: 'Racha de 100 días', rarity: 'legendaria', icon: 'fuego', ok: c => c.streak >= 100 },
  { id: 'jefe12', name: 'Terror de los jefes', text: 'Vence a 12 jefes de la semana', rarity: 'legendaria', icon: 'escudo', ok: c => c.bosses >= 12 },
  { id: 'rango30', name: 'Bambú milenario', text: 'Llega al nivel 30', rarity: 'legendaria', icon: 'planta', ok: c => c.level >= 30 },
]
const MON_RARITY: Rarity[] = ['comun', 'comun', 'comun', 'comun', 'rara', 'rara', 'rara', 'epica', 'epica', 'legendaria']
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function album(data: AppData, today = dateKey()): Card[] {
  const recs = recordTable(data)
  const perDay = new Map<string, number>()
  data.sets.forEach(s => { if (s.note !== 'hecho' && s.reps) perDay.set(s.day, (perDay.get(s.day) ?? 0) + s.reps) })
  const km: Record<string, number> = { caminar: 0, correr: 0, bici: 0 }
  data.activities.forEach(a => { if (a.sport) km[a.sport] += a.km ?? 0 })
  const ctx: Ctx = {
    bosses: weeklyBoss(data, today).wins,
    best: re => recs.filter(r => re.test(plain(r.name))).reduce((m, r) => Math.max(m, r.best), 0),
    dayReps: Math.max(0, ...perDay.values()), streak: gardenStats(data, today).best, km, dungeons: clearedDays(data).length,
    records: recs.length, readDays: new Set(data.reading.map(r => r.day)).size, level: levelOf(totalXp(data, today)).level, sets: data.sets.length,
  }
  const cards: Card[] = adventure(data).battles.map((b, i) => ({ id: `mon-${i}`, name: b.monster.name, text: b.monster.title, rarity: MON_RARITY[i], kind: 'Monstruos', monster: b.monster, earned: !!b.defeatedDay, day: b.defeatedDay ?? undefined }))
  cards.push(...FEATS.map(f => ({ id: f.id, name: f.name, text: f.text, rarity: f.rarity, kind: 'Hazañas' as const, icon: f.icon, earned: f.ok(ctx) })))
  const ids = [...new Set([...seasonsPlayed(data), seasonIdOf(today)])].sort().reverse()
  for (const id of ids) {
    const st = season(data, today, id)
    const current = id === seasonIdOf(today)
    st.battles.forEach((b, k) => { if (current || b.defeatedDay) cards.push({ id: `tmp-${id}-${k}`, name: b.monster.name, text: `${st.name} · ${st.month} ${st.year}`, rarity: k === 3 ? 'epica' : 'rara', kind: 'Temporada', monster: b.monster, earned: !!b.defeatedDay, day: b.defeatedDay ?? undefined }) })
    if (current || st.done) cards.push({ id: `tmp-${id}-insignia`, name: `Insignia: ${st.name}`, text: `Venciste a los 4 de ${st.month} ${st.year}`, rarity: 'legendaria', kind: 'Temporada', icon: 'escudo', earned: st.done })
  }
  return cards
}
