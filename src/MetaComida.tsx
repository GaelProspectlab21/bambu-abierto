import { useEffect, useMemo, useRef } from 'react'
import { dateKey, type AppData } from './lib/model'
import { dayTotals } from './lib/nutrition'
import { llegoAMeta, metasComida } from './lib/nutrientes'
import { celebrate } from './ui'

/**
 * v12: el festejo grande de Comida. La primera vez del día que llegas a tu energía (tu piso si estás
 * creciendo), sale el plato que se llena. Vive en App para que funcione aunque registres desde Hoy.
 * Abrir la app con la meta ya cumplida no festeja: solo el momento en que la cruzas.
 */
export function MetaComida({ data }: { data: AppData }) {
  const day = dateKey()
  const metas = useMemo(() => metasComida(data), [data])
  const t = dayTotals(data, day)
  const antes = useRef<{ day: string; kcal: number } | null>(null)
  useEffect(() => {
    const prev = antes.current
    antes.current = { day, kcal: t.kcal }
    if (!prev || prev.day !== day || !metas) return
    try { if (localStorage.getItem('bambu.meta.comida') === day) return } catch { /* sin almacenamiento, igual festeja */ }
    if (!llegoAMeta(prev.kcal, t.kcal, metas.kcal)) return
    try { localStorage.setItem('bambu.meta.comida', day) } catch { /* sin almacenamiento */ }
    const prot = Math.round(t.protein)
    celebrate({ kind: 'meta', title: metas.crecer ? '¡Llegaste a tu energía para crecer!' : '¡Llegaste a tu meta de hoy!', text: `${t.kcal} kcal. Tu cuerpo tiene con qué entrenar, crecer y recuperarse.`,
      extra: prot >= metas.protein ? `Y también tu proteína: ${prot} g` : `Proteína: ${prot} de ${metas.protein} g` })
  }, [t.kcal, day, metas]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
