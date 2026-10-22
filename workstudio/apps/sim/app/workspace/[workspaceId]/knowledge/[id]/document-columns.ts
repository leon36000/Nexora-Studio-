import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { ResourceColumn } from '@/app/workspace/[workspaceId]/components'

/** Document table columns; headers are translated at render from `knowledge.documentColumns`. */
const DOCUMENT_COLUMN_DEFS: Array<Omit<ResourceColumn, 'header'>> = [
  { id: 'name', widthMultiplier: 0.8 },
  { id: 'size', widthMultiplier: 0.75 },
  { id: 'tokens', widthMultiplier: 0.75 },
  { id: 'chunks', widthMultiplier: 0.75 },
  { id: 'uploaded' },
  { id: 'status' },
  { id: 'tags' },
]

/** The document table columns with their headers in the active language. */
export function useDocumentColumns(): ResourceColumn[] {
  const t = useTranslations('knowledge.documentColumns')
  return useMemo(
    () => DOCUMENT_COLUMN_DEFS.map((column) => ({ ...column, header: t(column.id) })),
    [t]
  )
}
