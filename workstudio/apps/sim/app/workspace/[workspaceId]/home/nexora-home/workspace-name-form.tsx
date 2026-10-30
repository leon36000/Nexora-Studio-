'use client'

import { useState } from 'react'
import { Chip, ChipInput, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { useSession } from '@/lib/auth/client'
import { proposedWorkspaceName } from '@/lib/nexora/workspace-name'
import { useUpdateWorkspace, useWorkspacesQuery } from '@/hooks/queries/workspace'

interface WorkspaceNameFormProps {
  workspaceId: string
}

/**
 * Nexora edition, first launch: the workspace's name, proposed from the person's first name and
 * changed with one click (a workspace created before the elision fix reads « Espace de Essai »).
 */
export function WorkspaceNameForm({ workspaceId }: WorkspaceNameFormProps) {
  const t = useTranslations('home.nexoraHome.welcome.workspace')
  const { data: session } = useSession()
  const { data: workspaces } = useWorkspacesQuery()
  const updateWorkspace = useUpdateWorkspace()
  const [draft, setDraft] = useState<string | null>(null)

  const workspace = workspaces?.find((candidate) => candidate.id === workspaceId)
  if (!workspace) return null

  const name = draft ?? proposedWorkspaceName(workspace.name, session?.user?.name)
  const canSave =
    name.trim().length > 0 && name.trim() !== workspace.name && !updateWorkspace.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    updateWorkspace.mutate(
      { workspaceId, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t('saved'))
          setDraft(null)
        },
        onError: () => toast.error(t('failed')),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
      <label htmlFor='welcome-workspace-name' className='text-[var(--text-body)] text-sm'>
        {t('label')}
      </label>
      <div className='flex items-center gap-2'>
        <ChipInput
          id='welcome-workspace-name'
          value={name}
          maxLength={100}
          onChange={(event) => setDraft(event.target.value)}
          className='min-w-0 max-w-[320px] flex-1'
        />
        <Chip type='submit' variant='border' disabled={!canSave}>
          {t('save')}
        </Chip>
      </div>
    </form>
  )
}
