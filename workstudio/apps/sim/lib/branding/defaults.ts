import type { BrandConfig } from './types'

/**
 * Default brand configuration values (Nexora WorkStudio).
 */
export const defaultBrandConfig: BrandConfig = {
  name: 'Nexora WorkStudio',
  logoUrl: undefined,
  wordmarkUrl: undefined,
  faviconUrl: undefined,
  customCssUrl: undefined,
  supportEmail: 'support@example.com',
  documentationUrl: undefined,
  termsUrl: undefined,
  privacyUrl: undefined,
  theme: {
    primaryColor: '#4F46E5',
    primaryHoverColor: '#4338CA',
    accentColor: '#4F46E5',
    accentHoverColor: '#4338CA',
    backgroundColor: '#0c0c0c',
  },
  isWhitelabeled: false,
}
