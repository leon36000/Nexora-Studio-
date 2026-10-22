'use client'

import { Database, FolderPlus, Plus } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'

const COLUMNS = [
  { id: 'name' },
  { id: 'documents', widthMultiplier: 0.6 },
  { id: 'tokens', widthMultiplier: 0.6 },
  { id: 'connectors', widthMultiplier: 0.7 },
  { id: 'created' },
  { id: 'owner' },
  { id: 'updated' },
] as const

export default function KnowledgeLoading() {
  const t = useTranslations('knowledge.list')
  const columns = COLUMNS.map((column) => ({ ...column, header: t(`columns.${column.id}`) }))
  const actions: ChromeActionSpec[] = [
    { text: t('newFolder'), icon: FolderPlus },
    { text: t('newBase'), icon: Plus, variant: 'primary' },
  ]
  return (
    <ResourceChromeFallback
      icon={Database}
      title={t('rootLabel')}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
