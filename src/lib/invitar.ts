/** El mensaje que se copia: corto, con el enlace que ya trae el código puesto. */
export function mensajeInvitacion(code: string, base: string): string {
  const url = new URL(base)
  url.search = ''; url.hash = ''
  url.searchParams.set('invita', code)
  return `Te invito a Bambú. Entra aquí y crea tu cuenta: ${url.href} Tu código es ${code}. Sirve una vez y dura 30 días.`
}
