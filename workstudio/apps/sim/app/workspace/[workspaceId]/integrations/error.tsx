'use client'

import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function IntegrationsError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('integrations.error')
  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('title')}
      description={t('description')}
      loggerName='IntegrationsError'
    />
  )
}
