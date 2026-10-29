import { nexoraSiteLinks } from '@/lib/nexora/site-links'

interface LoginLayoutInput {
  /** `NEXT_PUBLIC_NEXORA_OIDC_NAME`: the single sign-in button's name, `null` while it is hidden. */
  oidcName: string | null
  /** The Nexora AI site's address, `null` when the identity provider is not the site. */
  siteUrl: string | null
  /** `NEXORA_OIDC_REQUIRED`: members cannot use a password. */
  ssoRequired: boolean
  locale?: string
}

/**
 * Nexora edition: how the sign-in page is laid out. With the site as identity provider (or members
 * bound to single sign-on) the button is the main action and the password form, kept for the
 * instance's owner and administrators, comes second. A customer creates their account on the site,
 * never on this instance: `signupUrl` is where « Créer un compte » leads.
 */
export function resolveLoginLayout({
  oidcName,
  siteUrl,
  ssoRequired,
  locale = 'fr',
}: LoginLayoutInput): {
  ssoFirst: boolean
  signupUrl: string | null
} {
  const links = nexoraSiteLinks(siteUrl, locale)
  const ssoFirst = Boolean(oidcName) && (links !== null || ssoRequired)
  return { ssoFirst, signupUrl: ssoFirst ? (links?.signup ?? null) : null }
}
