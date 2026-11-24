/** "1 serie", "2 series". Todo conteo visible pasa por aquí: un "1 hábitos" se nota y resta confianza. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
