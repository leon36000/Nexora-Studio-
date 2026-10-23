'use client'

import { useMemo } from 'react'
import { Chip, ChipLink, OverflowText } from '@sim/emcn'
import { HelpCircle, Loader, Plus, Sparkles } from '@sim/emcn/icons'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { docsUrl } from '@/lib/branding/docs-url'
import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import { useNewAgent } from '@/app/workspace/[workspaceId]/agents/use-new-agent'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useFolders } from '@/hooks/queries/folders'
import { useWorkflows } from '@/hooks/queries/workflows'
import type { WorkflowMetadata } from '@/stores/workflows/registry/types'

const NO_AGENTS: WorkflowMetadata[] = []

interface AgentListProps {
  workspaceId: string
}

/** Nexora edition: the workspace's agents — the workflows of its « Agents » folder. */
export function AgentList({ workspaceId }: AgentListProps) {
  const t = useTranslations('agents.list')
  const { canEdit } = useUserPermissionsContext()
  const { data: folders, isLoading: foldersLoading } = useFolders(workspaceId)
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(workspaceId)
  const { createAgent, isCreating } = useNewAgent(workspaceId)

  const agents = useMemo(() => {
    const folder = folders?.find(
      (candidate) => candidate.name === AGENTS_FOLDER && candidate.parentId === null
    )
    if (!folder || !workflows) return NO_AGENTS
    return workflows
      .filter((workflow) => workflow.folderId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [folders, workflows])

  const isLoading = foldersLoading || workflowsLoading

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <div className='flex shrink-0 items-center gap-1'>
            <ChipLink
              href={docsUrl('/agents')}
              target='_blank'
              rel='noopener noreferrer'
              leftIcon={HelpCircle}
            >
              {t('help')}
            </ChipLink>
            {canEdit && (
              <Chip
                variant='primary'
                leftIcon={Plus}
                disabled={isCreating}
                onClick={() => void createAgent()}
              >
                {t('newAgent')}
              </Chip>
            )}
          </div>
        </header>
        {isLoading ? (
          <Loader className='size-[16px] text-[var(--text-muted)]' animate />
        ) : agents.length === 0 ? (
          <p className='text-[var(--text-muted)] text-small'>{t('empty')}</p>
        ) : (
          <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
            {agents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/workspace/${workspaceId}/agents/${agent.id}`}
                  className='flex items-center gap-3 px-4 py-3 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none'
                >
                  <Sparkles className='size-[16px] shrink-0 text-[var(--text-icon)]' />
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <OverflowText
                      label={agent.name}
                      focusTarget='nearest-interactive'
                      className='text-[var(--text-body)] text-sm'
                    />
                    {agent.description && (
                      <OverflowText
                        label={agent.description}
                        focusTarget='nearest-interactive'
                        className='text-[var(--text-muted)] text-caption'
                      />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
