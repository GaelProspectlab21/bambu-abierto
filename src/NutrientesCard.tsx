import { useEffect, useState } from 'react'
import type { AppData } from './lib/model'
import { REFERENCIA, nutrientesDia } from './lib/nutrientes'
import { cargarEmpaquetados } from './lib/alimentosMx'

type Fila = { k: string; label: string; v: number; unidad: string; ref?: number; tipo: 'meta' | 'tope' | 'info'; nota?: string }

/**
 * v12: azúcar, fibra, sodio, carbohidratos y grasa del día, de un vistazo. Nada en rojo ni "te pasaste":
 * la fibra es una meta (más es mejor) y el azúcar y el sodio son referencias de la OMS, no castigos.
 */
export function NutrientesCard({ data, day, kcal }: { data: AppData; day: string; kcal: number }) {
  const [, setListo] = useState(0)
  useEffect(() => { void cargarEmpaquetados().then(setListo) }, [])
  const n = nutrientesDia(data, day)
  if (!n.total) return null
  const pctKcal = (g: number, porG: number) => kcal ? Math.round(g * porG / kcal * 100) : 0
  const filas: Fila[] = [
    { k: 'fibra', label: 'Fibra', v: n.fiber, unidad: 'g', ref: REFERENCIA.fiber, tipo: 'meta', nota: n.fiber >= REFERENCIA.fiber ? 'Meta cumplida' : 'Frijol, fruta y verdura suben esta' },
    { k: 'azucar', label: 'Azúcar', v: n.sugar, unidad: 'g', ref: REFERENCIA.sugar, tipo: 'tope', nota: n.sugar >= REFERENCIA.sugar ? 'Llegaste a la referencia. Lo que sigue, mejor sin azúcar' : `${Math.round(REFERENCIA.sugar - n.sugar)} g para la referencia` },
    { k: 'sodio', label: 'Sodio', v: n.sodium, unidad: 'mg', ref: REFERENCIA.sodium, tipo: 'tope' },
    { k: 'carbs', label: 'Carbohidratos', v: n.carbs, unidad: 'g', tipo: 'info', nota: `${pctKcal(n.carbs, 4)} % de tu energía` },
    { k: 'grasa', label: 'Grasa', v: n.fat, unidad: 'g', tipo: 'info', nota: `${pctKcal(n.fat, 9)} % de tu energía` },
  ]
  return <div className="d-card nutr-card">
    <div className="d-card-head"><h2>Lo que traía tu comida</h2></div>
    <ul className="nutr-lista">{filas.map(f => {
      const pct = f.ref ? Math.min(100, Math.round(f.v / f.ref * 100)) : 0
      return <li key={f.k} className={`nutr-${f.k} ${f.tipo} ${f.ref && f.v >= f.ref ? 'llena' : ''}`}>
        <div className="nutr-fila"><span>{f.label}</span><b>{f.unidad === 'mg' ? Math.round(f.v) : f.v.toFixed(f.v < 10 ? 1 : 0)} {f.unidad}{f.ref ? <small> de {f.ref}</small> : null}</b></div>
        {f.ref ? <i className="nutr-barra" role="progressbar" aria-label={f.label} aria-valuemin={0} aria-valuemax={f.ref} aria-valuenow={f.v}><u style={{ width: `${pct}%` }} /></i> : null}
        {f.nota && <small className="nutr-nota">{f.nota}</small>}
      </li>
    })}</ul>
    <p className="d-hint left">{n.conDatos === n.total ? 'Con datos de todo lo que registraste.' : `Con datos de ${n.conDatos} de ${n.total} alimentos. Los que anotas a ojo no traen estos números.`} Referencias: OMS.</p>
  </div>
}
