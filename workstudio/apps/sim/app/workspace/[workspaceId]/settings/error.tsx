'use client'

import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function SettingsError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('settings.errors.root')
  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('title')}
      description={t('description')}
      loggerName='SettingsError'
    />
  )
}
