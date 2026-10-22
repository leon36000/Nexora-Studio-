import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SSO_REQUIRED_ERROR_CODE } from '@/lib/auth/constants'
import { DesktopHandoffShell } from '@/app/desktop/components/desktop-handoff-shell'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.oauthError')
  return { title: t('title'), robots: { index: false } }
}

export const dynamic = 'force-dynamic'

interface OAuthErrorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Landing page for OAuth flows that end in an error before the flow state can
 * be parsed — most commonly the user clicking "Cancel"/"Deny" at the
 * provider's consent screen (`?error=access_denied`). Better Auth redirects
 * such errors to `onAPIError.errorURL` (this page) BEFORE it can honor a
 * per-flow `errorCallbackURL`, so the desktop handoff's loopback is never
 * pinged. Without this page those errors 404'd (a dead-end); here the user
 * gets a clear message and a way back. Re-initiating the sign-in/connect from
 * the app supersedes the idle handoff, so no explicit hand-back is needed.
 *
 * Error codes with a message of their own, keyed to `auth.oauthError`:
 * - `signup_disabled`: DISABLE_REGISTRATION rejecting a first-time sign-in; retrying
 *   can never succeed.
 * - `account_not_linked`: Better Auth refuses to link a provider that does not assert
 *   a verified email onto an existing account; retrying reproduces it exactly.
 * - SSO required: the person's organization refuses a social sign-in.
 * - `email_not_found`: the provider returned no email claim.
 * - `issuer_mismatch`: the callback's `iss` is not the discovered issuer.
 */
const FRIENDLY_KEYS = {
  access_denied: 'access_denied',
  oAuth_code_missing: 'oAuth_code_missing',
  signup_disabled: 'signup_disabled',
  account_not_linked: 'account_not_linked',
  [SSO_REQUIRED_ERROR_CODE]: 'ssoRequired',
  email_not_found: 'email_not_found',
  issuer_mismatch: 'issuer_mismatch',
} as const

type FriendlyKey = (typeof FRIENDLY_KEYS)[keyof typeof FRIENDLY_KEYS]

function messageKeyForError(code: string | undefined): FriendlyKey | 'generic' {
  if (code && Object.hasOwn(FRIENDLY_KEYS, code)) {
    return FRIENDLY_KEYS[code as keyof typeof FRIENDLY_KEYS]
  }
  return 'generic'
}

export default async function OAuthErrorPage({ searchParams }: OAuthErrorPageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations('auth.oauthError')])
  const code = typeof params.error === 'string' ? params.error : undefined

  return (
    <DesktopHandoffShell
      title={t('title')}
      description={`${t(messageKeyForError(code))} ${t('closeHint')}`}
    />
  )
}
