'use client'

import { useMemo } from 'react'
import { ChipCombobox } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { selectDelegationTargets } from '@/lib/nexora/delegation/form-targets'
import { type AgentHandoff, HANDOFF_MODES } from '@/lib/nexora/delegation/handoffs'
import {
  type SelectedItem,
  SelectedList,
} from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/selected-list'
import { useFolders } from '@/hooks/queries/folders'
import { useWorkflows } from '@/hooks/queries/workflows'

interface HandoffsFieldProps {
  workspaceId: string
  /** The agent itself, never offered as one it can hand a request to. */
  workflowId: string
  value: AgentHandoff[]
  /** The agent keeps the conversation (memory), which handing it over needs. */
  memory: boolean
  onChange: (handoffs: AgentHandoff[]) => void
  disabled?: boolean
}

/** « Peut confier à »: the published agents this one may hand a request to, and how. */
export function HandoffsField({
  workspaceId,
  workflowId,
  value,
  memory,
  onChange,
  disabled,
}: HandoffsFieldProps) {
  const t = useTranslations('agents.editor.handoffs')
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(workspaceId)
  const { data: folders, isLoading: foldersLoading } = useFolders(workspaceId)
  const isLoading = workflowsLoading || foldersLoading

  const targets = useMemo(
    () => selectDelegationTargets(workflows ?? [], folders, workflowId),
    [workflows, folders, workflowId]
  )
  const options = useMemo(
    () => targets.map((agent) => ({ value: agent.id, label: agent.name })),
    [targets]
  )

  const items = useMemo<SelectedItem[]>(() => {
    const names = new Map(targets.map((agent) => [agent.id, agent.name]))
    const modeOptions = HANDOFF_MODES.map((mode) => ({
      value: mode,
      label: t(mode === 'reply' ? 'modeReply' : 'modeTransfer'),
    }))
    return value.map((handoff) => {
      const name = names.get(handoff.agentId)
      return {
        key: handoff.agentId,
        label: name ?? handoff.agentId,
        missing: !isLoading && name === undefined,
        choice: {
          value: handoff.mode,
          label: t('mode', { name: name ?? handoff.agentId }),
          options: modeOptions,
        },
      }
    })
  }, [targets, value, isLoading, t])

  const handlePickerChange = (ids: string[]) => {
    onChange(
      ids.map(
        (id) => value.find((handoff) => handoff.agentId === id) ?? { agentId: id, mode: 'reply' }
      )
    )
  }

  const handleModeChange = (agentId: string, mode: string) => {
    const next = HANDOFF_MODES.find((candidate) => candidate === mode)
    if (!next) return
    onChange(
      value.map((handoff) => (handoff.agentId === agentId ? { ...handoff, mode: next } : handoff))
    )
  }

  const needsMemory = !memory && value.some((handoff) => handoff.mode === 'transfer')

  return (
    <div className='flex flex-col gap-2'>
      <ChipCombobox
        options={options}
        multiSelect
        multiSelectValues={value.map((handoff) => handoff.agentId)}
        onMultiSelectChange={handlePickerChange}
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
        onRemove={(agentId) => onChange(value.filter((handoff) => handoff.agentId !== agentId))}
        onChoiceChange={handleModeChange}
        disabled={disabled}
      />
      <p className='text-[var(--text-muted)] text-caption'>{t('hint')}</p>
      {needsMemory && (
        <p role='status' className='text-[var(--text-muted)] text-caption'>
          {t('memoryNeeded')}
        </p>
      )}
    </div>
  )
}
