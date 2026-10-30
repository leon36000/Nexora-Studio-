'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useFeatureFlag } from '@/app/workspace/[workspaceId]/providers/feature-flags-provider'

interface ChangelogFeatureGateProps {
  children: ReactNode
}

export function ChangelogFeatureGate({ children }: ChangelogFeatureGateProps) {
  const t = useTranslations('shell.featureUnavailable')
  const enabled = useFeatureFlag('changelog')
  return enabled ? (
    children
  ) : (
    <div role='alert' className='p-6 text-[var(--text-muted)]'>
      {t('changelog')}
    </div>
  )
}
