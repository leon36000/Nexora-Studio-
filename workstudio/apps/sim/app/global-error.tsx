'use client'

import { useSyncExternalStore } from 'react'
import { Chip, StatusPageContent } from '@sim/emcn'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, resolveLocale } from '@/lib/i18n/config'
import { season } from '@/app/_styles/fonts/season/season'
import { LogoShell } from '@/app/(landing)/components/logo-shell'
import enErrors from '@/messages/en/errors.json'
import frErrors from '@/messages/fr/errors.json'
import '@/app/_styles/globals.css'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

const ERROR_MESSAGES: Record<Locale, { errors: typeof enErrors }> = {
  fr: { errors: frErrors },
  en: { errors: enErrors },
}

function subscribeToNothing() {
  return () => {}
}

/**
 * The root layout, and with it the request's locale, is gone when this boundary
 * renders, so the language is resolved again from the saved choice and the
 * browser languages, the same inputs the server reads.
 */
function readBrowserLocale(): Locale {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1)
  return resolveLocale({ cookie, acceptLanguage: navigator.languages.join(',') })
}

function readServerLocale(): Locale {
  return DEFAULT_LOCALE
}

interface GlobalErrorContentProps {
  reset: () => void
}

function GlobalErrorContent({ reset }: GlobalErrorContentProps) {
  const t = useTranslations('errors.globalError')
  return (
    <StatusPageContent title={t('title')} description={t('description')}>
      <Chip variant='primary' onClick={reset}>
        {t('retry')}
      </Chip>
    </StatusPageContent>
  )
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  const locale = useSyncExternalStore(subscribeToNothing, readBrowserLocale, readServerLocale)
  return (
    <html lang={locale} className='light'>
      <body className={`${season.variable} font-season`}>
        <NextIntlClientProvider locale={locale} messages={ERROR_MESSAGES[locale]}>
          <LogoShell center>
            <GlobalErrorContent reset={reset} />
          </LogoShell>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
