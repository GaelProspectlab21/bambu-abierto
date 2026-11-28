/**
 * La bienvenida personalizada (v11). Lo que copiamos de Opal, la app del nicho que más factura:
 * pocas decisiones, preguntas sobre TI, un reporte con un dato que pega y un compromiso.
 * Lo que NO copiamos: el muro de pago y las cifras infladas. El dato sale de tus respuestas.
 */
import type { Modules } from './model'

export type Meta = 'fuerte' | 'leer' | 'dios' | 'enfoque' | 'comer' | 'dormir' | 'cel'
export const METAS: { id: Meta; label: string; text: string }[] = [
  { id: 'fuerte', label: 'Ponerme fuerte', text: 'Rutina en casa que sube contigo.' },
  { id: 'cel', label: 'Soltar el cel', text: 'Una pausa antes de abrir redes.' },
  { id: 'leer', label: 'Leer más', text: 'Cinco minutos al día ya cuentan.' },
  { id: 'dios', label: 'Acercarme a Dios', text: 'Biblia y oración, sin señal.' },
  { id: 'enfoque', label: 'Enfocarme en lo mío', text: 'Bloques de tiempo sin distracciones.' },
  { id: 'comer', label: 'Comer mejor', text: 'Registra en segundos, sin culpa.' },
  { id: 'dormir', label: 'Dormir mejor', text: 'Hora fija y sin pantallas antes.' },
]

/** Tus metas encienden los módulos. Nada de una lista de interruptores que no entiendes. */
export function modulosDe(metas: Meta[]): Modules {
  const m = new Set(metas)
  const mods = { training: m.has('fuerte'), reading: m.has('leer') || m.has('dios'), bible: m.has('dios'), focus: m.has('enfoque') || m.has('cel'), food: m.has('comer') }
  return Object.values(mods).some(Boolean) ? mods : { reading: true, bible: false, training: true, focus: true, food: false }
}

/** Hábitos sugeridos según tus metas (ids del catálogo de la bienvenida). Los puedes quitar. */
export function habitosDe(metas: Meta[]): string[] {
  const out = new Set<string>(['cama'])
  if (metas.includes('dios')) out.add('oracion')
  if (metas.includes('dormir')) { out.add('dormir'); out.add('pantallas') }
  if (metas.includes('cel')) out.add('pantallas')
  if (metas.includes('comer')) { out.add('comida'); out.add('agua') }
  if (metas.includes('fuerte')) out.add('estirar')
  return [...out]
}

export const HORAS_CEL: { id: string; label: string; horas: number }[] = [
  { id: 'poco', label: 'Menos de 2 horas', horas: 1.5 },
  { id: 'medio', label: 'De 2 a 4 horas', horas: 3 },
  { id: 'mucho', label: 'De 4 a 6 horas', horas: 5 },
  { id: 'muchisimo', label: 'Más de 6 horas', horas: 7 },
]

/**
 * El reporte: años de vida frente al cel si sigues igual hasta los 80, y cuántos recuperas con
 * una hora menos al día. Cuenta simple y honesta: horas al día por años que te quedan, entre 24.
 */
export function reporteCel(horas: number, edad: number | undefined): { anos: number; recuperas: number; hasta: number } {
  const desde = edad && edad >= 8 && edad < 80 ? edad : 15
  const quedan = 80 - desde
  const anos = Math.round(horas * quedan / 24 * 10) / 10
  const recuperas = Math.round(Math.min(1, horas) * quedan / 24 * 10) / 10
  return { anos, recuperas, hasta: quedan }
}

/** La frase del compromiso, con tu nombre. La filosofía de Gael: dar lo que traes, no más. */
export const compromiso = (nombre: string) => `Yo, ${nombre.trim() || 'yo'}, voy a dar lo que traigo cada día. No más, no menos.`
