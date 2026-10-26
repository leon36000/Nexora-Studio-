import { INTEGRATION_COUNT_LABEL } from '@sim/deployment-config/integration-claims'
import type { MetadataRoute } from 'next'
import { createTranslator } from 'next-intl'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { WORKSPACES_PATH } from '@/lib/navigation/paths'
import { getBrandConfig } from '@/ee/whitelabeling'
import { getLocaleMessages } from '@/i18n/messages'

export const dynamic = 'force-dynamic'

/** Names longer than this are shortened to their first word under an app icon. */
const MAX_SHORT_NAME_LENGTH = 12

/**
 * Makes the instance installable ("Installer" in Chrome and Edge). Deliberately no service worker:
 * the signed-in application is never cached offline. The manifest is served to everyone, signed in
 * or not, so it reads the default locale instead of a session.
 */
export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrandConfig()
  const t = createTranslator({
    locale: DEFAULT_LOCALE,
    messages: getLocaleMessages(DEFAULT_LOCALE),
    namespace: 'common.manifest',
  })

  return {
    id: '/',
    name: brand.name,
    short_name: brand.name.length > MAX_SHORT_NAME_LENGTH ? brand.name.split(' ')[0] : brand.name,
    description: t('description', { name: brand.name, count: INTEGRATION_COUNT_LABEL }),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brand.theme?.primaryColor || '#4F46E5',
    icons: [
      { src: '/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/favicon/maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon/maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business'],
    shortcuts: [
      {
        name: t('shortcutName'),
        short_name: t('shortcutShortName'),
        description: t('shortcutDescription'),
        url: WORKSPACES_PATH,
      },
    ],
    lang: DEFAULT_LOCALE,
    dir: 'ltr',
  }
}
