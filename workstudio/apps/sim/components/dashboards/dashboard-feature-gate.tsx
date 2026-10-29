'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useFeatureFlag } from '@/app/workspace/[workspaceId]/providers/feature-flags-provider'

interface DashboardFeatureGateProps {
  children: ReactNode
}

export function DashboardFeatureGate({ children }: DashboardFeatureGateProps) {
  const t = useTranslations('shell.featureUnavailable')
  const enabled = useFeatureFlag('dashboards')
  return enabled ? (
    children
  ) : (
    <div role='alert' className='p-6 text-[var(--text-muted)]'>
      {t('dashboards')}
    </div>
  )
}
