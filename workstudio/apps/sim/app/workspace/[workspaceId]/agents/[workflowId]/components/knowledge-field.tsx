'use client'

import { useMemo } from 'react'
import { ChipCombobox } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  type SelectedItem,
  SelectedList,
} from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/selected-list'
import { useKnowledgeBasesQuery } from '@/hooks/queries/kb/knowledge'

interface KnowledgeFieldProps {
  workspaceId: string
  value: string[]
  onChange: (knowledgeBaseIds: string[]) => void
  disabled?: boolean
}

/** The knowledge bases the agent searches. */
export function KnowledgeField({ workspaceId, value, onChange, disabled }: KnowledgeFieldProps) {
  const t = useTranslations('agents.editor.knowledge')
  const { data: bases, isLoading } = useKnowledgeBasesQuery(workspaceId)

  const options = useMemo(
    () => (bases ?? []).map((base) => ({ value: base.id, label: base.name })),
    [bases]
  )

  const items = useMemo<SelectedItem[]>(() => {
    const names = new Map((bases ?? []).map((base) => [base.id, base.name]))
    return value.map((id) => ({
      key: id,
      label: names.get(id) ?? id,
      missing: !isLoading && !names.has(id),
    }))
  }, [bases, value, isLoading])

  return (
    <div className='flex flex-col gap-2'>
      <ChipCombobox
        options={options}
        multiSelect
        multiSelectValues={value}
        onMultiSelectChange={onChange}
        overlayLabel={t('add')}
        placeholder={t('add')}
        emptyMessage={t('none')}
        searchPlaceholder={t('search')}
        isLoading={isLoading}
        searchable
        disabled={disabled}
      />
      <SelectedList
        items={items}
        onRemove={(id) => onChange(value.filter((candidate) => candidate !== id))}
        disabled={disabled}
      />
    </div>
  )
}
