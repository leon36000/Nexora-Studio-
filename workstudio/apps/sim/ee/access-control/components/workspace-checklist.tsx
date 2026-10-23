// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import { Checkbox, Label } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface WorkspaceRef {
  id: string
  name: string
}

interface WorkspaceChecklistProps {
  workspaces: WorkspaceRef[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

/** The organization's workspaces a non-default access group targets. */
export function WorkspaceChecklist({
  workspaces,
  selected,
  onChange,
  disabled = false,
}: WorkspaceChecklistProps) {
  const t = useTranslations('settings.accessGroups')
  if (workspaces.length === 0) {
    return <p className='text-[var(--text-muted)] text-small'>{t('scope.noWorkspaces')}</p>
  }
  const chosen = new Set(selected)
  return (
    <div className='flex max-h-[200px] flex-col gap-2 overflow-y-auto'>
      {workspaces.map((workspace) => {
        const id = `access-group-workspace-${workspace.id}`
        return (
          <div key={workspace.id} className='flex items-center gap-2'>
            <Checkbox
              id={id}
              size='sm'
              checked={chosen.has(workspace.id)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? [...selected, workspace.id]
                    : selected.filter((workspaceId) => workspaceId !== workspace.id)
                )
              }
            />
            <Label htmlFor={id}>{workspace.name}</Label>
          </div>
        )
      })}
    </div>
  )
}
