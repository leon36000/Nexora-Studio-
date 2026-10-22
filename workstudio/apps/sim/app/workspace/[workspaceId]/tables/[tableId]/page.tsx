import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import TableLoading from '@/app/workspace/[workspaceId]/tables/[tableId]/loading'
import { PermissionAccessBoundary } from '@/ee/access-requests/components/permission-access-boundary'
import { Table } from './table'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tables.detail')
  return { title: t('metaTitle') }
}

/**
 * Table-detail page entry. `Table` reads URL query params via nuqs (which uses
 * `useSearchParams` internally), so it must sit under a Suspense boundary. The
 * fallback renders the real chrome so a suspend never shows a blank frame.
 */
export default function TablePage() {
  return (
    <Suspense fallback={<TableLoading />}>
      <PermissionAccessBoundary configKey='hideTablesTab'>
        <Table />
      </PermissionAccessBoundary>
    </Suspense>
  )
}
