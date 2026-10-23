import { createTranslator, type Messages } from 'next-intl'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import enEmails from '@/messages/en/emails.json'
import frEmails from '@/messages/fr/emails.json'

/**
 * Emails are rendered on the server and read by someone who is not making the
 * request, so they use the instance's default language rather than a request locale.
 */
export const EMAIL_LOCALE: Locale = DEFAULT_LOCALE

/** BCP 47 tag for date and number formatting in the email language. */
export const EMAIL_DATE_LOCALE: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' }

let translator: ReturnType<typeof createEmailTranslator> | undefined

/**
 * Only the `emails` zone is loaded: every auth and billing route reaches these
 * templates, and the full catalog would weigh on each of their module graphs.
 */
function createEmailTranslator() {
  const messages: Messages = { emails: EMAIL_LOCALE === 'en' ? enEmails : frEmails }
  return createTranslator({
    locale: EMAIL_LOCALE,
    messages,
    namespace: 'emails',
  })
}

/** Translator for the `emails` messages in the email language. */
export function getEmailTranslator() {
  translator ??= createEmailTranslator()
  return translator
}

/** A count in the email language's digit grouping (`1,000` / `1 000`). */
export function formatEmailNumber(value: number): string {
  return value.toLocaleString(EMAIL_DATE_LOCALE[EMAIL_LOCALE])
}

/** A money amount with two decimals and no grouping, as `12.50` / `12,50`. */
export function formatEmailAmount(value: number): string {
  return value.toLocaleString(EMAIL_DATE_LOCALE[EMAIL_LOCALE], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  })
}
