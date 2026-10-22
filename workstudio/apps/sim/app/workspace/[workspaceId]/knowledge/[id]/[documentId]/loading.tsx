'use client'

import { Database, FileText, Plus } from '@sim/emcn/icons'
import { noop } from '@sim/utils/helpers'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'
import type { BreadcrumbItem } from '@/app/workspace/[workspaceId]/components/resource/components/resource-header'

const COLUMNS = [
  { id: 'content' },
  { id: 'index', widthMultiplier: 0.6 },
  { id: 'tokens', widthMultiplier: 0.6 },
  { id: 'status', widthMultiplier: 0.75 },
] as const

export default function DocumentLoading() {
  const t = useTranslations('knowledge.document')
  const columns = COLUMNS.map((column) => ({ ...column, header: t(`columns.${column.id}`) }))
  const actions: ChromeActionSpec[] = [{ text: t('newChunk'), icon: Plus, variant: 'primary' }]
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('rootLabel'), icon: Database, onClick: noop },
    { label: '…', icon: Database },
    { label: '…', terminal: true },
  ]
  return (
    <ResourceChromeFallback
      icon={FileText}
      breadcrumbs={breadcrumbs}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
