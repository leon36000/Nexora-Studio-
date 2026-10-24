import { createTranslator } from 'next-intl'
import type { Locale } from '@/lib/i18n/config'
import { requestLocale } from '@/lib/i18n/request-locale.server'
import {
  CAPABILITY_RULES,
  type PermissionGroupCapability,
} from '@/lib/permission-groups/capabilities'
import { PermissionGroupCapabilityError } from '@/lib/permission-groups/capability-error'
import enErrors from '@/messages/en/errors.json'
import frErrors from '@/messages/fr/errors.json'

const ERRORS: Record<Locale, typeof enErrors> = { en: enErrors, fr: frErrors }

const translators = new Map<Locale, ReturnType<typeof createRefusalTranslator>>()

/** Only the small `errors` zone is loaded. */
function createRefusalTranslator(locale: Locale) {
  return createTranslator({ locale, messages: { errors: ERRORS[locale] }, namespace: 'errors' })
}

/**
 * The one sentence every capability refusal uses, wherever it is raised.
 *
 * Shared so the funnel, a raw route gating inline, and a parameterized rule
 * asserted from a use case cannot word the same refusal three ways. Each rule's
 * `describe` is written to read as this sentence's subject.
 *
 * Nexora edition: worded in the language of the request being answered (the member's saved
 * choice, then the browser's), else the instance default; English keeps the original sentence
 * and `describe` subjects. Server-only, so client bundles never load the messages.
 */
export function capabilityRefusal(
  capability: PermissionGroupCapability,
  locale: Locale = requestLocale()
): string {
  let t = translators.get(locale)
  if (!t) {
    t = createRefusalTranslator(locale)
    translators.set(locale, t)
  }
  return t('capabilityRefusal', {
    subject: t(`capabilities.${capability.replaceAll('.', '_')}` as 'capabilities.workflows_edit'),
  })
}

/**
 * Throws {@link capabilityRefusal} as the error the surfaces project.
 *
 * Accepts any capability, static or parameterized, because a parameterized one
 * is refused from a call site rather than by the funnel and still has to read
 * identically.
 */
export function refuseCapability(capability: PermissionGroupCapability): never {
  throw new PermissionGroupCapabilityError(
    capability,
    CAPABILITY_RULES[capability].detailCode,
    capabilityRefusal(capability)
  )
}
