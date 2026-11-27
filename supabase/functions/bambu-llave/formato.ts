// Contrato mínimo que ya consumen Atajos y Scriptable, sin datos de la cuenta.
export function consultaLlave(url: string): { tipo: 'pase' | 'widget'; llave: string } | null {
  const p = new URL(url).searchParams
  const tipo = p.get('tipo'), llave = p.get('k') ?? ''
  if ((tipo !== 'pase' && tipo !== 'widget') || !/^[A-Za-z0-9_-]{16,40}$/.test(llave)) return null
  return { tipo, llave }
}

export function salidaLlave(tipo: 'pase' | 'widget', row: Record<string, unknown>) {
  const fields: Record<string, { stringValue: string } | { integerValue: string }> = {}
  if (tipo === 'pase') {
    if (typeof row.hasta !== 'string' || !Number.isFinite(Date.parse(row.hasta))) return null
    fields.hasta = { stringValue: new Date(row.hasta).toISOString() }
  } else {
    const e = row.estado
    if (!e || typeof e !== 'object' || Array.isArray(e)) return null
    const estado = e as Record<string, unknown>
    for (const k of ['dia', 'rutina']) fields[k] = { stringValue: typeof estado[k] === 'string' ? estado[k] as string : '' }
    for (const k of ['racha', 'nivel', 'xpHoy', 'meta', 'minutos', 'retos']) {
      const n = estado[k]
      fields[k] = { integerValue: String(typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0) }
    }
  }
  return { fields }
}
