'use client'

import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function SkillsError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('integrations.skillsPage')
  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('loadFailedTitle')}
      description={t('loadFailedDescription')}
      loggerName='SkillsError'
    />
  )
}
