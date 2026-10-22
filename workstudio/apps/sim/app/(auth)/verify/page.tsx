import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isProd } from '@/lib/core/config/env-flags'
import { hasEmailService } from '@/lib/messaging/email/mailer'
import { isEmailVerificationEffectivelyEnabled } from '@/lib/messaging/email/verification'
import { VerifyContent } from '@/app/(auth)/verify/verify-content'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.verify')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default function VerifyPage() {
  const emailServiceConfigured = hasEmailService()

  return (
    <VerifyContent
      hasEmailService={emailServiceConfigured}
      isProduction={isProd}
      isEmailVerificationEnabled={isEmailVerificationEffectivelyEnabled()}
    />
  )
}
