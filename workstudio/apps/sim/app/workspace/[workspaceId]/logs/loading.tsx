'use client'

import { Library, RefreshCw } from '@sim/emcn'
import { Download } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'

const COLUMN_IDS = ['workflow', 'date', 'status', 'cost', 'trigger', 'duration'] as const

export default function LogsLoading() {
  const t = useTranslations('logs')
  const columns = COLUMN_IDS.map((id) => ({ id, header: t(`columns.${id}`) }))
  const actions: ChromeActionSpec[] = [
    { text: t('actions.export'), icon: Download },
    { text: t('actions.refresh'), icon: RefreshCw },
    { text: t('actions.logs'), active: true },
    { text: t('actions.dashboard') },
  ]
  return (
    <ResourceChromeFallback
      icon={Library}
      title={t('page.title')}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('list.searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
