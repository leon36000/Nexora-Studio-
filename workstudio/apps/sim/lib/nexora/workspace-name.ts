/** A first name that starts with a vowel takes « d’ »: « Espace d’Amélie », not « Espace de Amélie ». */
const STARTS_WITH_VOWEL = /^[aeiouàâäéèêëîïôöùûüœæ]/i

/** A first name has a letter and is not an e-mail address (a profile can carry the address as its name). */
const FIRST_NAME = /^\p{L}[\p{L}'’-]*$/u

/** Nexora edition: the name of a person's first workspace, in French (« Espace de Camille »). */
export function defaultWorkspaceName(userName: string | null | undefined): string {
  const firstName = userName?.trim().split(/\s+/)[0]
  if (!firstName || !FIRST_NAME.test(firstName)) return 'Mon espace'
  return STARTS_WITH_VOWEL.test(firstName) ? `Espace d’${firstName}` : `Espace de ${firstName}`
}
