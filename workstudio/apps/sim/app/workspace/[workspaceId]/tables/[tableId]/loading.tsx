'use client'

import { Table as TableIcon } from '@sim/emcn/icons'
import { noop } from '@sim/utils/helpers'
import { useTranslations } from 'next-intl'
import { ResourceChromeFallback } from '@/app/workspace/[workspaceId]/components/resource/components/resource-chrome-fallback'
import type { BreadcrumbItem } from '@/app/workspace/[workspaceId]/components/resource/components/resource-header'

export default function TableLoading() {
  const t = useTranslations('tables.list')
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('title'), icon: TableIcon, onClick: noop },
    { label: '…', terminal: true },
  ]
  // The table editor's header has no static actions at load (import/run controls
  // are data-gated) and its options bar is sort + filter with no search. The grid
  // body fills in once the editor mounts, so no table chrome is rendered here.
  return <ResourceChromeFallback icon={TableIcon} breadcrumbs={breadcrumbs} hasSort hasFilter />
}
