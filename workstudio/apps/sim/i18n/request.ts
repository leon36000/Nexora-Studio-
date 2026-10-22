import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE, resolveLocale } from '@/lib/i18n/config'
import { getLocaleMessages } from '@/i18n/messages'

/** Dates render in this zone on the server and the client alike, so hydration matches. */
const TIME_ZONE = process.env.NEXORA_TIME_ZONE?.trim() || 'Europe/Paris'

export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])
  const locale = resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language') ?? undefined,
  })
  return { locale, messages: getLocaleMessages(locale), timeZone: TIME_ZONE }
})
