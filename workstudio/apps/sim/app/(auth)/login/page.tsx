import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { isNexoraOidcRequired, isRegistrationDisabled } from '@/lib/core/config/env-flags'
import { resolveLoginLayout } from '@/lib/nexora/login-layout'
import { getNexoraOidcName } from '@/lib/nexora/oidc-name'
import { getNexoraSiteUrl } from '@/lib/nexora/site-links'
import { getOAuthProviderStatus } from '@/app/(auth)/components/oauth-provider-checker'
import LoginLoading from '@/app/(auth)/login/loading'
import LoginForm from '@/app/(auth)/login/login-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const [{ githubAvailable, googleAvailable, microsoftAvailable }, locale] = await Promise.all([
    getOAuthProviderStatus(),
    getLocale(),
  ])
  const { ssoFirst, signupUrl } = resolveLoginLayout({
    oidcName: getNexoraOidcName(),
    siteUrl: getNexoraSiteUrl(),
    ssoRequired: isNexoraOidcRequired,
    locale,
  })

  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm
        githubAvailable={githubAvailable}
        googleAvailable={googleAvailable}
        microsoftAvailable={microsoftAvailable}
        registrationDisabled={isRegistrationDisabled}
        ssoFirst={ssoFirst}
        siteSignupUrl={signupUrl}
      />
    </Suspense>
  )
}
