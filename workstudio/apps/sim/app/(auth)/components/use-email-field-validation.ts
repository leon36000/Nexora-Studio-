'use client'

import { normalizeEmail } from '@sim/utils/string'
import { useTranslations } from 'next-intl'
import { quickValidateEmail } from '@/lib/messaging/email/validation'

/** Message keys for the rejection reasons `quickValidateEmail` reports. */
const EMAIL_REASON_KEYS = {
  'Invalid email format': 'invalidFormat',
  'Missing domain': 'missingDomain',
  'Disposable email addresses are not allowed': 'disposable',
  'Email contains suspicious patterns': 'suspicious',
  'Invalid domain format': 'invalidDomain',
} as const

function isKnownReason(reason: string): reason is keyof typeof EMAIL_REASON_KEYS {
  return Object.hasOwn(EMAIL_REASON_KEYS, reason)
}

/**
 * Validates the email field of the login and signup forms, returning the
 * translated messages to show beneath it (empty when the address is accepted).
 */
export function useEmailFieldValidation(): (emailValue: string) => string[] {
  const t = useTranslations('auth.emailValidation')

  return (emailValue) => {
    if (!emailValue || !emailValue.trim()) return [t('required')]

    const validation = quickValidateEmail(normalizeEmail(emailValue))
    if (validation.isValid) return []

    const reason = validation.reason
    return [
      reason && isKnownReason(reason) ? t(`reasons.${EMAIL_REASON_KEYS[reason]}`) : t('invalid'),
    ]
  }
}
