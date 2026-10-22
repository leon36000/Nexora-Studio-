import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isRegistrationDisabled } from '@/lib/core/config/env-flags'
import { getOAuthProviderStatus } from '@/app/(auth)/components/oauth-provider-checker'
import LoginLoading from '@/app/(auth)/login/loading'
import LoginForm from '@/app/(auth)/login/login-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const { githubAvailable, googleAvailable, microsoftAvailable } = await getOAuthProviderStatus()

  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm
        githubAvailable={githubAvailable}
        googleAvailable={googleAvailable}
        microsoftAvailable={microsoftAvailable}
        registrationDisabled={isRegistrationDisabled}
      />
    </Suspense>
  )
}
