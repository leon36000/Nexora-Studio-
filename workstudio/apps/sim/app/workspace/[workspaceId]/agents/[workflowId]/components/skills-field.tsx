'use client'

import { useMemo } from 'react'
import { ChipCombobox } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { AgentSkill } from '@/lib/nexora/agents'
import {
  type SelectedItem,
  SelectedList,
} from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/selected-list'
import { useWorkspaceSkills } from '@/hooks/queries/nexora-skills'

interface SkillsFieldProps {
  workspaceId: string
  value: AgentSkill[]
  onChange: (skills: AgentSkill[]) => void
  disabled?: boolean
}

/** The skills of the workspace the agent can load when a request matches their description. */
export function SkillsField({ workspaceId, value, onChange, disabled }: SkillsFieldProps) {
  const t = useTranslations('agents.editor.skills')
  const { data: skills, isLoading } = useWorkspaceSkills(workspaceId)
  const catalog = useMemo(() => skills ?? [], [skills])
  const options = useMemo(
    () => catalog.map((skill) => ({ value: skill.id, label: skill.name })),
    [catalog]
  )

  const items = useMemo<SelectedItem[]>(() => {
    const names = new Set(catalog.map((skill) => skill.id))
    return value.map((skill) => ({
      key: skill.skillId,
      label: skill.name || skill.skillId,
      missing: !isLoading && !names.has(skill.skillId),
    }))
  }, [catalog, value, isLoading])

  const handlePickerChange = (ids: string[]) => {
    onChange(
      ids.flatMap((id) => {
        const kept = value.find((skill) => skill.skillId === id)
        if (kept) return [kept]
        const picked = catalog.find((skill) => skill.id === id)
        return picked
          ? [{ skillId: picked.id, name: picked.name, description: picked.description }]
          : []
      })
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <ChipCombobox
        options={options}
        multiSelect
        multiSelectValues={value.map((skill) => skill.skillId)}
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
        onRemove={(id) => onChange(value.filter((skill) => skill.skillId !== id))}
        disabled={disabled}
      />
    </div>
  )
}
