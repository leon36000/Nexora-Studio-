'use client'

import { File as FilesIcon, FolderPlus, Plus, Upload } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  type ChromeActionSpec,
  ResourceChromeFallback,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'

export default function FilesLoading() {
  const t = useTranslations('files.list')
  const columns = [
    { id: 'name', header: t('columns.name'), widthMultiplier: 1.15 },
    { id: 'size', header: t('columns.size'), widthMultiplier: 0.85 },
    { id: 'type', header: t('columns.type'), widthMultiplier: 1.0 },
    { id: 'created', header: t('columns.created') },
    { id: 'owner', header: t('columns.owner') },
    { id: 'updated', header: t('columns.updated') },
  ]
  const actions: ChromeActionSpec[] = [
    { text: t('actions.upload'), icon: Upload },
    { text: t('actions.newFolder'), icon: FolderPlus },
    { text: t('actions.newFile'), icon: Plus, variant: 'primary' },
  ]
  return (
    <ResourceChromeFallback
      icon={FilesIcon}
      title={t('title')}
      columns={columns}
      actions={actions}
      searchPlaceholder={t('searchPlaceholder')}
      hasSort
      hasFilter
    />
  )
}
