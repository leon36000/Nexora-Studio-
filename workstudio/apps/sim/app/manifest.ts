import { INTEGRATION_COUNT_LABEL } from '@sim/deployment-config/integration-claims'
import type { MetadataRoute } from 'next'
import { WORKSPACES_PATH } from '@/lib/navigation/paths'
import { getBrandConfig } from '@/ee/whitelabeling'

export const dynamic = 'force-dynamic'

export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrandConfig()

  return {
    name: brand.name,
    short_name: brand.name,
    description: `${brand.name} : créez, déployez et pilotez vos agents et automatisations IA. ${INTEGRATION_COUNT_LABEL} intégrations.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brand.theme?.primaryColor || '#4F46E5',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['productivity', 'developer', 'business'],
    shortcuts: [
      {
        name: 'Create Workflow',
        short_name: 'New',
        description: 'Create a new AI workflow',
        url: WORKSPACES_PATH,
      },
    ],
    lang: 'en-US',
    dir: 'ltr',
  }
}
