'use client'

import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function LogsError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('logs.error')
  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('title')}
      description={t('description')}
      loggerName='LogsError'
    />
  )
}
