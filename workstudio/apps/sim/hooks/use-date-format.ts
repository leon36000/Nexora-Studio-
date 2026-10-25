'use client'

import { useMemo } from 'react'
import { formatDateForLocale, formatDateTimeForLocale } from '@/lib/i18n/dates'
import { useInterfaceLocale } from '@/hooks/use-interface-locale'

/**
 * Date formatters bound to the interface language (next-intl's active locale): use these instead
 * of `formatDate` / `formatDateTime` from `@sim/utils/formatting`, which write US English.
 */
export function useDateFormat() {
  const locale = useInterfaceLocale()
  return useMemo(
    () => ({
      locale,
      /** « 24 oct. 2026 » (en: « Oct 24, 2026 »). */
      formatDate: (date: Date) => formatDateForLocale(date, locale),
      /** « 24 oct. 2026, 14:00 UTC+2 » (en: « Oct 24, 2026, 2:00 PM EDT »). */
      formatDateTime: (date: Date, timezone?: string) =>
        formatDateTimeForLocale(date, locale, timezone),
    }),
    [locale]
  )
}
