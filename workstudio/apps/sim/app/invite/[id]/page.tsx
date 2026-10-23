import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { isRegistrationDisabled } from '@/lib/core/config/env-flags'
import Invite from '@/app/invite/[id]/invite'
import InviteLoading from '@/app/invite/[id]/loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.invite')
  return { title: t('metaTitle'), robots: { index: false } }
}

export const dynamic = 'force-dynamic'

export default function InvitePage() {
  return (
    <Suspense fallback={<InviteLoading />}>
      <Invite registrationDisabled={isRegistrationDisabled} />
    </Suspense>
  )
}
