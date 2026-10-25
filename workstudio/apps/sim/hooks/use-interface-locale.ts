'use client'

import { useLocale } from 'next-intl'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/config'

/** The interface language of the signed-in member (`fr` or `en`), typed. */
export function useInterfaceLocale(): Locale {
  const active = useLocale()
  return isLocale(active) ? active : DEFAULT_LOCALE
}
