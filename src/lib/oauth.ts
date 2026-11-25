export const GOOGLE_INVITE_MESSAGE = 'Para entrar con Google primero crea tu cuenta con tu código de invitación. Luego la vinculas en Ajustes.'

export function oauthErrorUrl(href: string): { error: boolean; cleanHref: string } {
  const url = new URL(href)
  const hash = new URLSearchParams(url.hash.slice(1))
  const error = url.searchParams.has('error_description') || hash.has('error_description')
  if (error) {
    for (const key of ['error', 'error_code', 'error_description', 'error_uri']) {
      url.searchParams.delete(key)
      hash.delete(key)
    }
    if (url.hash.includes('=')) url.hash = hash.toString()
  }
  return { error, cleanHref: url.pathname + url.search + url.hash }
}
export function googleProviderEnabled(settings: unknown): boolean {
  return typeof settings === 'object' && settings !== null &&
    'external' in settings && typeof settings.external === 'object' && settings.external !== null &&
    'google' in settings.external && settings.external.google === true
}
export function googleIdentityLinked(identities: { provider: string }[]): boolean {
  return identities.some(identity => identity.provider === 'google')
}

/** El trigger de invitación rechaza cuentas nuevas sin código: ese error se traduce para la persona. */
export function isInviteRejection(message: string): boolean {
  return /database error saving new user|invit/i.test(message)
}
