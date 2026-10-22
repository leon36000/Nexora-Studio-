// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { Metadata } from 'next'
import type { BrandConfig, OrganizationWhitelabelSettings, ThemeColors } from '@/lib/branding/types'
import { getEnv } from '@/lib/core/config/env'

export type { BrandConfig, OrganizationWhitelabelSettings, ThemeColors }

/** Neutral Nexora defaults. Every value can be overridden with the core's NEXT_PUBLIC_BRAND_* variables. */
export const NEXORA_BRAND_DEFAULTS: BrandConfig = Object.freeze({
  name: 'Nexora WorkStudio',
  logoUrl: undefined,
  wordmarkUrl: undefined,
  faviconUrl: undefined,
  customCssUrl: undefined,
  supportEmail: 'support@example.com',
  documentationUrl: undefined,
  termsUrl: undefined,
  privacyUrl: undefined,
  theme: Object.freeze({
    primaryColor: '#4F46E5',
    primaryHoverColor: '#4338CA',
    accentColor: '#4F46E5',
    accentHoverColor: '#4338CA',
    backgroundColor: '#0c0c0c',
  }),
  isWhitelabeled: true,
}) as BrandConfig

function read(name: string): string | undefined {
  const value = getEnv(name)
  return value && value.trim() ? value.trim() : undefined
}

/** Instance brand: Nexora defaults overlaid with any NEXT_PUBLIC_BRAND_* environment values. */
export function getBrandConfig(): BrandConfig {
  const base = NEXORA_BRAND_DEFAULTS
  return {
    name: read('NEXT_PUBLIC_BRAND_NAME') ?? base.name,
    logoUrl: read('NEXT_PUBLIC_BRAND_LOGO_URL') ?? base.logoUrl,
    wordmarkUrl: base.wordmarkUrl,
    faviconUrl: read('NEXT_PUBLIC_BRAND_FAVICON_URL') ?? base.faviconUrl,
    customCssUrl: read('NEXT_PUBLIC_CUSTOM_CSS_URL') ?? base.customCssUrl,
    supportEmail: read('NEXT_PUBLIC_SUPPORT_EMAIL') ?? base.supportEmail,
    documentationUrl: read('NEXT_PUBLIC_DOCUMENTATION_URL') ?? base.documentationUrl,
    termsUrl: read('NEXT_PUBLIC_TERMS_URL') ?? base.termsUrl,
    privacyUrl: read('NEXT_PUBLIC_PRIVACY_URL') ?? base.privacyUrl,
    theme: {
      primaryColor: read('NEXT_PUBLIC_BRAND_PRIMARY_COLOR') ?? base.theme?.primaryColor,
      primaryHoverColor:
        read('NEXT_PUBLIC_BRAND_PRIMARY_HOVER_COLOR') ?? base.theme?.primaryHoverColor,
      accentColor: read('NEXT_PUBLIC_BRAND_ACCENT_COLOR') ?? base.theme?.accentColor,
      accentHoverColor: read('NEXT_PUBLIC_BRAND_ACCENT_HOVER_COLOR') ?? base.theme?.accentHoverColor,
      backgroundColor: read('NEXT_PUBLIC_BRAND_BACKGROUND_COLOR') ?? base.theme?.backgroundColor,
    },
    isWhitelabeled: true,
  }
}

/** Client-side accessor. The instance brand is static, so no context is required. */
export function useBrandConfig(): BrandConfig {
  return getBrandConfig()
}

/** Overlays per-organization settings (if any) on the instance brand. */
export function mergeOrgBrandConfig(
  orgSettings: OrganizationWhitelabelSettings | null | undefined,
  base: BrandConfig = getBrandConfig()
): BrandConfig {
  if (!orgSettings) return base
  return {
    ...base,
    name: orgSettings.brandName || base.name,
    logoUrl: orgSettings.logoUrl || base.logoUrl,
    wordmarkUrl: orgSettings.wordmarkUrl || base.wordmarkUrl,
    supportEmail: orgSettings.supportEmail || base.supportEmail,
    documentationUrl: orgSettings.documentationUrl || base.documentationUrl,
    termsUrl: orgSettings.termsUrl || base.termsUrl,
    privacyUrl: orgSettings.privacyUrl || base.privacyUrl,
    theme: {
      ...base.theme,
      ...(orgSettings.primaryColor ? { primaryColor: orgSettings.primaryColor } : {}),
      ...(orgSettings.primaryHoverColor ? { primaryHoverColor: orgSettings.primaryHoverColor } : {}),
      ...(orgSettings.accentColor ? { accentColor: orgSettings.accentColor } : {}),
      ...(orgSettings.accentHoverColor ? { accentHoverColor: orgSettings.accentHoverColor } : {}),
    },
    isWhitelabeled: true,
  }
}

/** Root metadata for the App Router layout. */
export function generateBrandedMetadata(overrides: Partial<Metadata> = {}): Metadata {
  const brand = getBrandConfig()
  return {
    title: { default: brand.name, template: `%s | ${brand.name}` },
    description: `${brand.name} : créez, déployez et pilotez vos agents et automatisations IA.`,
    applicationName: brand.name,
    ...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}),
    ...overrides,
  }
}

/** CSS custom-property overrides injected by the root layout (empty string = no override). */
export function generateThemeCSS(): string {
  const theme = getBrandConfig().theme
  if (!theme) return ''
  const vars: string[] = []
  if (theme.primaryColor) vars.push(`--brand-primary: ${theme.primaryColor}; --brand: ${theme.primaryColor};`)
  if (theme.primaryHoverColor)
    vars.push(`--brand-primary-hover: ${theme.primaryHoverColor}; --brand-hover: ${theme.primaryHoverColor};`)
  if (theme.accentColor) vars.push(`--brand-accent: ${theme.accentColor};`)
  if (theme.accentHoverColor) vars.push(`--brand-accent-hover: ${theme.accentHoverColor};`)
  return vars.length ? `:root { ${vars.join(' ')} }` : ''
}
