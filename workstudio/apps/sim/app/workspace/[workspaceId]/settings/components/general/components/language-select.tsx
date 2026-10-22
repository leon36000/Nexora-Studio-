'use client'

import { ChipSelect } from '@sim/emcn'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  type Locale,
} from '@/lib/i18n/config'

/** Each language is named in itself, so a reader can always find their own. */
const LANGUAGE_OPTIONS: { label: string; value: Locale }[] = [
  { label: 'Français', value: 'fr' },
  { label: 'English', value: 'en' },
]

interface LanguageSelectProps {
  ariaLabel: string
}

/** Interface language picker. The choice lives in a cookie read by `i18n/request.ts`. */
export function LanguageSelect({ ariaLabel }: LanguageSelectProps) {
  const locale = useLocale()
  const router = useRouter()

  const handleChange = (value: string) => {
    if (!isLocale(value) || value === locale) return
    document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    router.refresh()
  }

  return (
    <ChipSelect
      aria-label={ariaLabel}
      align='start'
      fullWidth
      dropdownWidth='trigger'
      value={locale}
      onChange={handleChange}
      options={LANGUAGE_OPTIONS}
    />
  )
}
