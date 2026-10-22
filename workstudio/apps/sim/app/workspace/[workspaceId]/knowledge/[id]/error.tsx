'use client'

import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function KnowledgeBaseError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('knowledge.errors')
  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('baseTitle')}
      description={t('baseDescription')}
      loggerName='KnowledgeBaseError'
    />
  )
}
