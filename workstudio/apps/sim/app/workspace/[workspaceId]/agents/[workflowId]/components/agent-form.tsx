'use client'

import { useState } from 'react'
import { Chip, ChipInput, ChipLink, ChipTextarea, Switch, toast } from '@sim/emcn'
import { MessageSquareText, Workflow } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { type AgentConfig, diffAgentConfigs } from '@/lib/nexora/agents'
import { AgentPageHeader } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/agent-page-header'
import { KnowledgeField } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/knowledge-field'
import { PublishSection } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/publish-section'
import { TestPanel } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/test-panel'
import { ToolsField } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/tools-field'
import { VersionsSection } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/versions-section'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { ModelPicker } from '@/app/workspace/[workspaceId]/agents/components/model-picker'
import type { ChatDetail } from '@/hooks/queries/deployments'
import { useSaveAgent } from '@/hooks/queries/nexora-agents'

const logger = createLogger('NexoraAgentForm')

interface AgentFormProps {
  workspaceId: string
  workflowId: string
  initial: AgentConfig
  /** The stored draft; saving keeps its block ids. */
  state: unknown
  agentBlockId: string
  existingChat: ChatDetail | null
  readOnly: boolean
  onVersionActivated: () => void
}

/** The agent form: every field of the agent, saving, testing, publishing and versions. */
export function AgentForm({
  workspaceId,
  workflowId,
  initial,
  state,
  agentBlockId,
  existingChat,
  readOnly,
  onVersionActivated,
}: AgentFormProps) {
  const t = useTranslations('agents.editor')
  const { mutateAsync: saveAgent, isPending: isSaving } = useSaveAgent()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [nameError, setNameError] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)

  const isDirty = diffAgentConfigs(saved, draft).some(({ field }) => field !== 'welcomeMessage')

  const update = <K extends keyof AgentConfig>(field: K, value: AgentConfig[K]) => {
    setDraft((previous) => ({ ...previous, [field]: value }))
    if (field === 'name') setNameError(false)
  }

  /** Saves the form when it changed; resolves `false` when it could not be saved. */
  const ensureSaved = async (): Promise<boolean> => {
    if (!isDirty) return true
    const name = draft.name.trim()
    if (!name) {
      setNameError(true)
      return false
    }
    const config = { ...draft, name }
    try {
      await saveAgent({ workspaceId, workflowId, config, previousState: state })
      setSaved(config)
      return true
    } catch (error) {
      logger.error('Agent save failed', { workflowId, error })
      toast.error(t('saveFailed'))
      return false
    }
  }

  const handleSave = async () => {
    if (await ensureSaved()) toast.success(t('saved'))
  }

  return (
    <div className='flex min-h-0 flex-1'>
      <div className='min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-7 py-10'>
          <AgentPageHeader
            workspaceId={workspaceId}
            backLabel={t('back')}
            title={draft.name || initial.name}
          >
            <ChipLink href={`/workspace/${workspaceId}/w/${workflowId}`} leftIcon={Workflow}>
              {t('openInEditor')}
            </ChipLink>
            <Chip
              leftIcon={MessageSquareText}
              active={isTestOpen}
              onClick={() => setIsTestOpen((open) => !open)}
            >
              {t('test')}
            </Chip>
            {!readOnly && (
              <Chip
                variant='primary'
                disabled={!isDirty || isSaving}
                onClick={() => void handleSave()}
              >
                {t('save')}
              </Chip>
            )}
          </AgentPageHeader>

          <div className='flex flex-col gap-4'>
            <FormField
              label={t('fields.name')}
              htmlFor='agent-name'
              error={nameError ? t('nameRequired') : null}
            >
              <ChipInput
                id='agent-name'
                value={draft.name}
                error={nameError}
                disabled={readOnly}
                onChange={(event) => update('name', event.target.value)}
              />
            </FormField>
            <FormField label={t('fields.description')} htmlFor='agent-description'>
              <ChipInput
                id='agent-description'
                value={draft.description}
                disabled={readOnly}
                onChange={(event) => update('description', event.target.value)}
              />
            </FormField>
            <FormField label={t('fields.instructions')} htmlFor='agent-instructions'>
              <ChipTextarea
                id='agent-instructions'
                value={draft.instructions}
                disabled={readOnly}
                rows={8}
                resizable
                onChange={(event) => update('instructions', event.target.value)}
              />
            </FormField>
            <FormField label={t('fields.model')}>
              <ModelPicker
                value={draft.model}
                disabled={readOnly}
                onChange={(model) => update('model', model)}
              />
            </FormField>
            <FormField label={t('fields.tools')}>
              <ToolsField
                workspaceId={workspaceId}
                workflowId={workflowId}
                value={draft.tools}
                disabled={readOnly}
                onChange={(tools) => update('tools', tools)}
              />
            </FormField>
            <FormField label={t('fields.knowledgeBaseIds')}>
              <KnowledgeField
                workspaceId={workspaceId}
                value={draft.knowledgeBaseIds}
                disabled={readOnly}
                onChange={(ids) => update('knowledgeBaseIds', ids)}
              />
            </FormField>
            <div className='flex items-center justify-between gap-4 pl-0.5'>
              <label htmlFor='agent-memory' className='text-[var(--text-muted)] text-small'>
                {t('fields.memory')}
              </label>
              <Switch
                id='agent-memory'
                checked={draft.memory}
                disabled={readOnly}
                onCheckedChange={(checked) => update('memory', checked)}
              />
            </div>
            <FormField
              label={t('fields.welcomeMessage')}
              htmlFor='agent-welcome'
              hint={t('welcomeHint')}
            >
              <ChipInput
                id='agent-welcome'
                value={draft.welcomeMessage}
                disabled={readOnly}
                onChange={(event) => update('welcomeMessage', event.target.value)}
              />
            </FormField>
          </div>

          <PublishSection
            workflowId={workflowId}
            agentBlockId={agentBlockId}
            name={draft.name.trim() || saved.name}
            description={draft.description}
            welcomeMessage={draft.welcomeMessage}
            existingChat={existingChat}
            ensureSaved={ensureSaved}
            readOnly={readOnly}
          />
          <VersionsSection
            workspaceId={workspaceId}
            workflowId={workflowId}
            readOnly={readOnly}
            onActivated={onVersionActivated}
          />
        </div>
      </div>
      {isTestOpen && (
        <TestPanel
          workflowId={workflowId}
          ensureSaved={ensureSaved}
          onClose={() => setIsTestOpen(false)}
        />
      )}
    </div>
  )
}
