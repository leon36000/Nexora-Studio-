'use client'

import { Plus, Upload } from '@sim/emcn'
import { FolderPlus, Table as TableIcon } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'

export default function TablesLoading() {
  const t = useTranslations('tables.list')
  const columns = [
    { id: 'name', header: t('columns.name') },
    { id: 'columns', header: t('columns.columns') },
    { id: 'rows', header: t('columns.rows') },
    { id: 'created', header: t('columns.created') },
    { id: 'owner', header: t('columns.owner') },
    { id: 'updated', header: t('columns.updated') },
  ]
  const actions: ChromeActionSpec[] = [
    { text: t('actions.importCsv'), icon: Upload },
    { text: t('actions.newFolder'), icon: FolderPlus },
    { text: t('actions.newTable'), icon: Plus, variant: 'primary' },
  ]
  return (
    <ResourceChromeFallback
      icon={TableIcon}
      title={t('title')}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
