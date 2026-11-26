export type Rank = { name: string; from: number; tier: number; img: string; motto: string }

export const RANKS: Rank[] = [
  { name: 'Semilla', from: 1, tier: 0, img: 'img/rango-01-semilla.webp', motto: 'Todo empieza bajo tierra.' },
  { name: 'Brote', from: 3, tier: 1, img: 'img/rango-02-brote.webp', motto: 'Ya asomaste la cabeza.' },
  { name: 'Raíces', from: 5, tier: 2, img: 'img/rango-03-raices.webp', motto: 'Lo que no se ve te sostiene.' },
  { name: 'Tallo', from: 7, tier: 3, img: 'img/rango-04-tallo.webp', motto: 'Creces derecho.' },
  { name: 'Caña de acero', from: 9, tier: 4, img: 'img/rango-05-cana.webp', motto: 'Te doblas pero no te rompes.' },
  { name: 'Bambú joven', from: 12, tier: 5, img: 'img/rango-06-joven.webp', motto: 'Nadie te para.' },
  { name: 'Bambú firme', from: 15, tier: 6, img: 'img/rango-07-firme.webp', motto: 'La constancia ya es tuya.' },
  { name: 'Bosquecito', from: 19, tier: 7, img: 'img/rango-08-bosquecito.webp', motto: 'Tus hábitos ya hacen sombra.' },
  { name: 'Bosque', from: 24, tier: 8, img: 'img/rango-09-bosque.webp', motto: 'Eres un ecosistema.' },
  { name: 'Bambú milenario', from: 30, tier: 9, img: 'img/rango-10-antiguo.webp', motto: 'Leyenda viva.' },
]

export function rankOf(level: number): { rank: Rank; next: Rank | null } {
  const i = RANKS.reduce((acc, r, k) => level >= r.from ? k : acc, 0)
  return { rank: RANKS[i], next: RANKS[i + 1] ?? null }
}
