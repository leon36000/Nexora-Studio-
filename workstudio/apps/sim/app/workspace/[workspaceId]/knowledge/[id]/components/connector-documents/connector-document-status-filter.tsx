'use client'

import { ChipDropdown } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type {
  ConnectorDocumentFilter,
  ConnectorDocumentsData,
} from '@/lib/api/contracts/knowledge/connectors'

interface ConnectorDocumentStatusFilterProps {
  filter: ConnectorDocumentFilter
  onFilterChange: (filter: ConnectorDocumentFilter) => void
  counts?: ConnectorDocumentsData['counts']
  isLoading: boolean
}

export function ConnectorDocumentStatusFilter({
  filter,
  onFilterChange,
  counts = { active: 0, excluded: 0, failed: 0, skipped: 0 },
  isLoading,
}: ConnectorDocumentStatusFilterProps) {
  const t = useTranslations('knowledge.connectorDocuments.statusFilter')
  const option = (status: ConnectorDocumentFilter) => ({
    value: status,
    label: isLoading ? t(status) : t('withCount', { label: t(status), count: counts[status] }),
  })
  return (
    <ChipDropdown
      aria-label={t('ariaLabel')}
      value={filter}
      onChange={(value) => {
        if (value === 'active' || value === 'excluded' || value === 'failed' || value === 'skipped')
          onFilterChange(value)
      }}
      matchTriggerWidth={false}
      options={[option('active'), option('excluded'), option('failed'), option('skipped')]}
    />
  )
}
