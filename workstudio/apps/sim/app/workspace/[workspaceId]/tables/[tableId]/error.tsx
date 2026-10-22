'use client'

import { Chip } from '@sim/emcn'
import { ArrowLeft } from '@sim/emcn/icons'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type ErrorBoundaryProps, ErrorState } from '@/app/workspace/[workspaceId]/components/error'

export default function TableError({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const t = useTranslations('tables.detail.error')

  return (
    <ErrorState
      error={error}
      reset={reset}
      title={t('title')}
      description={t('description')}
      loggerName='TableError'
    >
      <Chip leftIcon={ArrowLeft} onClick={() => router.push(`/workspace/${workspaceId}/tables`)}>
        {t('goBack')}
      </Chip>
    </ErrorState>
  )
}
