'use client'

import { useMemo, useState } from 'react'
import { ChipLink } from '@sim/emcn'
import { Loader, Workflow } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { readAgentWorkflow } from '@/lib/nexora/agents'
import { AgentForm } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/agent-form'
import { AgentPageHeader } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/agent-page-header'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useChatDeploymentInfo } from '@/hooks/queries/deployments'
import { useWorkflowMap, useWorkflowState } from '@/hooks/queries/workflows'

interface AgentEditorProps {
  workspaceId: string
  workflowId: string
}

/**
 * Nexora edition: one agent's page. An agent edited in the editor beyond the agent shape is
 * never rewritten here: the page only links to the editor.
 */
export function AgentEditor({ workspaceId, workflowId }: AgentEditorProps) {
  const t = useTranslations('agents')
  const { canEdit } = useUserPermissionsContext()
  const { data: state, isLoading, isError } = useWorkflowState(workflowId)
  const { data: workflowMap } = useWorkflowMap(workspaceId)
  const chat = useChatDeploymentInfo(workflowId)
  const [chatSettled, setChatSettled] = useState(false)
  const [formRevision, setFormRevision] = useState(0)

  if (!chatSettled && !chat.isLoading) setChatSettled(true)

  const config = useMemo(() => (state ? readAgentWorkflow(state) : null), [state])
  const agentBlockId = useMemo(
    () => (state ? Object.values(state.blocks).find((block) => block.type === 'agent')?.id : null),
    [state]
  )
  const workflow = workflowMap?.[workflowId]
  const title = workflow?.name ?? config?.name ?? ''

  const editorLink = (
    <ChipLink href={`/workspace/${workspaceId}/w/${workflowId}`} leftIcon={Workflow}>
      {t('editor.openInEditor')}
    </ChipLink>
  )

  if (config && agentBlockId && chatSettled) {
    return (
      <AgentForm
        key={`${workflowId}:${formRevision}`}
        workspaceId={workspaceId}
        workflowId={workflowId}
        initial={{
          ...config,
          name: workflow?.name ?? config.name,
          description: workflow?.description ?? config.description,
          welcomeMessage:
            chat.existingChat?.customizations?.welcomeMessage ?? t('defaults.welcomeMessage'),
        }}
        state={state}
        agentBlockId={agentBlockId}
        existingChat={chat.existingChat}
        readOnly={!canEdit}
        onVersionActivated={() => setFormRevision((revision) => revision + 1)}
      />
    )
  }

  const isPending = isLoading || (Boolean(config) && !chatSettled)

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-7 py-10'>
        <AgentPageHeader workspaceId={workspaceId} backLabel={t('editor.back')} title={title}>
          {state && !isPending && editorLink}
        </AgentPageHeader>
        {isPending ? (
          <div className='flex items-center gap-2 text-[var(--text-muted)] text-small'>
            <Loader className='size-[14px]' animate />
            {t('editor.loading')}
          </div>
        ) : isError || !state ? (
          <p className='text-[var(--text-error)] text-small'>{t('editor.loadFailed')}</p>
        ) : (
          <p className='rounded-lg border border-[var(--border)] px-4 py-3 text-[var(--text-body)] text-small'>
            {t('editor.readOnlyNotice')}
          </p>
        )}
      </div>
    </div>
  )
}
