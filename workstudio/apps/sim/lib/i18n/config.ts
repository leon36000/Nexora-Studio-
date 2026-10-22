/** Interface languages shipped with Nexora WorkStudio. French is the default. */
export const LOCALES = ['fr', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

/** Cookie holding the language a user picked in the settings. */
export const LOCALE_COOKIE = 'NEXORA_LOCALE'

/** One year: the choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

function fromAcceptLanguage(header: string | undefined): Locale | null {
  if (!header) return null
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      const quality = q ? Number.parseFloat(q.trim().slice(2)) : 1
      return { language: tag.trim().toLowerCase().split('-')[0], quality, index }
    })
    .filter((entry) => entry.language && !Number.isNaN(entry.quality) && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
  return ranked.map((entry) => entry.language).find(isLocale) ?? null
}

/**
 * The interface language for a request: the saved choice when it is a shipped
 * locale, else the best supported browser language, else French.
 */
export function resolveLocale(input: { cookie?: string; acceptLanguage?: string }): Locale {
  if (isLocale(input.cookie)) return input.cookie
  return fromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE
}
