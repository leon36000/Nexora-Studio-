'use client'

import { useState } from 'react'
import { Banner } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { useSession } from '@/lib/auth/client'
import { APP_ENTRY_PATH } from '@/lib/navigation/paths'
import { useStopImpersonating } from '@/hooks/queries/admin-users'
import { clearUserData } from '@/stores'

export function ImpersonationBanner() {
  const t = useTranslations('shell.impersonationBanner')
  const { data: session, isPending } = useSession()
  const stopImpersonating = useStopImpersonating()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const userLabel = session?.user?.name || t('thisUser')
  const userEmail = session?.user?.email

  if (isPending || !session?.session?.impersonatedBy) {
    return null
  }

  return (
    <Banner
      variant='destructive'
      text={
        userEmail
          ? t('textWithEmail', { user: userLabel, email: userEmail })
          : t('text', { user: userLabel })
      }
      textClassName='text-red-700 dark:text-red-300'
      actionLabel={stopImpersonating.isPending || isRedirecting ? t('returning') : t('stop')}
      actionVariant='destructive'
      actionDisabled={stopImpersonating.isPending || isRedirecting}
      onAction={() =>
        stopImpersonating.mutate(undefined, {
          onError: () => {
            setIsRedirecting(false)
          },
          onSuccess: async () => {
            setIsRedirecting(true)
            await clearUserData({ preserveRecentImpersonations: true })
            window.location.assign(APP_ENTRY_PATH)
          },
        })
      }
    />
  )
}
