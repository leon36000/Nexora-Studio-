import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { isRegistrationDisabled, isSsoEnabled } from '@/lib/core/config/env-flags'
import SSOLoading from '@/app/(auth)/sso/loading'
import SSOForm from '@/ee/sso/components/sso-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.sso')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default async function SSOPage() {
  if (!isSsoEnabled) {
    redirect('/login')
  }

  return (
    <Suspense fallback={<SSOLoading />}>
      <SSOForm registrationDisabled={isRegistrationDisabled} />
    </Suspense>
  )
}
