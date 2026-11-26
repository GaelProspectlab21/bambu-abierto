import type { Collection, RecordRow } from './records'

export type FsValue =
  | { nullValue: null } | { booleanValue: boolean } | { integerValue: string } | { doubleValue: number }
  | { stringValue: string } | { timestampValue: string } | { arrayValue: { values?: FsValue[] } } | { mapValue: { fields?: Record<string, FsValue> } }
export type FsDoc = { name: string; fields?: Record<string, FsValue> }

export function encode(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encode(x)])) } }
  return { nullValue: null }
}

export function decode(v: FsValue | undefined): unknown {
  if (!v) return undefined
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('stringValue' in v) return v.stringValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  if ('mapValue' in v) return fieldsOf(v.mapValue.fields)
  return null
}

export function fieldsOf(fields: Record<string, FsValue> | undefined): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([k, x]) => [k, decode(x)]))
}

export function tsToMicros(ts: string): number {
  const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?Z$/.exec(ts)
  if (!m) return 0
  return Date.parse(`${m[1]}Z`) * 1000 + Number(((m[2] ?? '') + '000000').slice(0, 6))
}

export function microsToTs(micros: number): string {
  const sec = Math.floor(micros / 1e6)
  const base = new Date(sec * 1000).toISOString().replace(/\.\d{3}Z$/, '')
  return `${base}.${String(micros - sec * 1e6).padStart(6, '0')}Z`
}

export const docId = (collection: string, id: string) => `${collection}~${encodeURIComponent(id)}`

export function recordFields(row: RecordRow): Record<string, FsValue> {
  return {
    c: { stringValue: row.collection },
    i: { stringValue: row.id },
    p: { stringValue: JSON.stringify(row.deleted ? {} : row.payload) },
    d: { booleanValue: row.deleted },
    t: { integerValue: String(Math.round(row.clientUpdatedAt)) },
  }
}

export function rowOf(doc: FsDoc): { row: RecordRow; s: number } | null {
  const f = fieldsOf(doc.fields)
  if (typeof f.c !== 'string' || typeof f.i !== 'string' || typeof f.s !== 'string') return null
  let payload: Record<string, unknown> = {}
  try { const p = JSON.parse(typeof f.p === 'string' ? f.p : '{}'); if (p && typeof p === 'object') payload = p } catch { payload = {} }
  return { row: { collection: f.c as Collection, id: f.i, payload, deleted: f.d === true, clientUpdatedAt: Number(f.t) || 0 }, s: tsToMicros(f.s) }
}

const AUTH_ERRORS: [RegExp, string][] = [
  [/EMAIL_EXISTS/, 'Ese correo ya tiene cuenta. Entra con tu contraseña.'],
  [/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/, 'El correo o la contraseña no son correctos.'],
  [/WEAK_PASSWORD/, 'La contraseña necesita al menos 8 caracteres.'],
  [/INVALID_EMAIL|MISSING_EMAIL/, 'Revisa que el correo esté bien escrito.'],
  [/MISSING_PASSWORD/, 'Escribe tu contraseña.'],
  [/TOO_MANY_ATTEMPTS/, 'Hubo muchos intentos seguidos. Espera unos minutos y vuelve a probar.'],
  [/USER_DISABLED/, 'Esta cuenta está desactivada.'],
  [/REAUTH_GOOGLE/, 'Por seguridad, cierra sesión, vuelve a entrar con Google y borra tu cuenta en los siguientes 4 minutos. No se borró nada.'],
  [/CREDENTIAL_TOO_OLD|TOKEN_EXPIRED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN|INVALID_ID_TOKEN/, 'Tu sesión venció. Vuelve a entrar.'],
  [/OPERATION_NOT_ALLOWED|ADMIN_ONLY_OPERATION/, 'Crear cuentas está apagado por ahora.'],
  [/GOOGLE_CANCELADO/, 'No se completó el acceso con Google. Vuelve a intentarlo.'],
  [/GOOGLE_ESTADO/, 'No pudimos confirmar el acceso con Google. Vuelve a intentarlo.'],
  [/GOOGLE_OTRA_CUENTA|FEDERATED_USER_ID_ALREADY_LINKED/, 'Ese correo ya tiene cuenta con contraseña. Entra con tu correo y tu contraseña.'],
  [/INVALID_IDP_RESPONSE/, 'Google no aceptó el acceso. Vuelve a intentarlo.'],
]
export function authError(code: string): string {
  return AUTH_ERRORS.find(([re]) => re.test(code))?.[1] ?? 'No se pudo completar. Revisa tu señal y vuelve a intentar.'
}
export const sessionGone = (code: string) => /TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(code)
