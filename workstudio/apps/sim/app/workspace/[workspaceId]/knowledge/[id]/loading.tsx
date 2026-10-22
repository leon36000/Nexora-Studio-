'use client'

import { Database, Plus } from '@sim/emcn/icons'
import { noop } from '@sim/utils/helpers'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'
import type { BreadcrumbItem } from '@/app/workspace/[workspaceId]/components/resource/components/resource-header'
import { useDocumentColumns } from '@/app/workspace/[workspaceId]/knowledge/[id]/document-columns'

export default function KnowledgeBaseLoading() {
  const t = useTranslations('knowledge.base')
  const columns = useDocumentColumns()
  const actions: ChromeActionSpec[] = [
    { text: t('newConnector'), icon: Plus },
    { text: t('newDocuments'), icon: Plus, variant: 'primary' },
  ]
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('rootLabel'), icon: Database, onClick: noop },
    { label: '…', terminal: true },
  ]
  return (
    <ResourceChromeFallback
      icon={Database}
      breadcrumbs={breadcrumbs}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
