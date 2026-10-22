'use client'

import { ChipSelect } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { SandboxCliToolId } from '@/lib/api/contracts/sandboxes'
import { SANDBOX_CLI_TOOLS } from '@/lib/execution/remote-sandbox/cli-tools'
import { CLI_TOOL_GROUPS } from '@/app/workspace/[workspaceId]/settings/components/sandboxes/utils'

const CLI_CATEGORY_MESSAGE_KEYS: Record<(typeof CLI_TOOL_GROUPS)[number]['section'], string> = {
  Cloud: 'cloud',
  Kubernetes: 'kubernetes',
  Infrastructure: 'infrastructure',
  Deployment: 'deployment',
  'Data & storage': 'dataStorage',
  Security: 'security',
}

interface ManagedCliSelectProps {
  value: SandboxCliToolId[]
  onChange: (value: SandboxCliToolId[]) => void
  disabled?: boolean
  stayBelow?: boolean
}

export function ManagedCliSelect({
  value,
  onChange,
  disabled = false,
  stayBelow = false,
}: ManagedCliSelectProps) {
  const t = useTranslations('settings.sandboxes.cliSelect')
  const displayLabel =
    value.length === 1
      ? SANDBOX_CLI_TOOLS[value[0]].label
      : value.length > 1
        ? t('selectedCount', { count: value.length })
        : undefined

  const groups = CLI_TOOL_GROUPS.map((group) => ({
    ...group,
    section: t(`categories.${CLI_CATEGORY_MESSAGE_KEYS[group.section]}`),
  }))

  const handleChange = (proposed: string[]) => {
    onChange(proposed as SandboxCliToolId[])
  }

  return (
    <ChipSelect
      align='start'
      fullWidth
      dropdownWidth='trigger'
      stayBelow={stayBelow}
      multiSelect
      searchable
      searchPlaceholder={t('searchPlaceholder')}
      placeholder={t('placeholder')}
      displayLabel={displayLabel}
      groups={groups}
      multiSelectValues={value}
      onMultiSelectChange={handleChange}
      showAllOption={false}
      disabled={disabled}
      aria-label={t('label')}
    />
  )
}
