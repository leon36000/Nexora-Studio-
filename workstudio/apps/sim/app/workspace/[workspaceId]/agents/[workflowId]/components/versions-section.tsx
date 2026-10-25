'use client'

import { useMemo, useState } from 'react'
import { Badge, Chip, ChipCombobox, ChipConfirmModal, toast } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { useFormatter, useTranslations } from 'next-intl'
import { type AgentConfig, diffAgentVersions, readAgentWorkflow } from '@/lib/nexora/agents'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useActivateDeploymentVersion, useDeploymentVersions } from '@/hooks/queries/deployments'
import { useKnowledgeBasesQuery } from '@/hooks/queries/kb/knowledge'
import { useNexoraPrompts } from '@/hooks/queries/nexora-prompts'
import {
  useDeploymentVersionState,
  useRevertToVersion,
  useWorkflows,
} from '@/hooks/queries/workflows'

const logger = createLogger('NexoraAgentVersions')

interface VersionsSectionProps {
  workspaceId: string
  workflowId: string
  readOnly: boolean
  /** The draft was replaced by an activated version: the form reloads from it. */
  onActivated: () => void
}

/** Published versions: activate an earlier one, compare two field by field. */
export function VersionsSection({
  workspaceId,
  workflowId,
  readOnly,
  onActivated,
}: VersionsSectionProps) {
  const t = useTranslations('agents.versions')
  const format = useFormatter()
  const { data, isLoading } = useDeploymentVersions(workflowId)
  const { mutateAsync: activateVersion, isPending: isActivating } = useActivateDeploymentVersion()
  const { mutateAsync: revertToVersion, isPending: isReverting } = useRevertToVersion()
  const [pendingVersion, setPendingVersion] = useState<number | null>(null)
  const [compareFrom, setCompareFrom] = useState<number | null>(null)
  const [compareTo, setCompareTo] = useState<number | null>(null)

  const versions = useMemo(
    () => [...(data?.versions ?? [])].sort((a, b) => b.version - a.version),
    [data?.versions]
  )
  const versionOptions = useMemo(
    () =>
      versions.map((version) => ({
        value: String(version.version),
        label: t('version', { version: version.version }),
      })),
    [versions, t]
  )
  const from = compareFrom ?? versions[1]?.version ?? null
  const to = compareTo ?? versions[0]?.version ?? null

  const handleActivate = async () => {
    if (pendingVersion === null) return
    const version = pendingVersion
    try {
      await activateVersion({ workflowId, version })
      await revertToVersion({ workflowId, version })
      toast.success(t('activated', { version }))
      setPendingVersion(null)
      onActivated()
    } catch (error) {
      logger.error('Version activation failed', { workflowId, version, error })
      toast.error(t('activateFailed'))
      setPendingVersion(null)
    }
  }

  return (
    <SettingsSection label={t('title')}>
      {isLoading ? (
        <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('loadingVersion')}</p>
      ) : versions.length === 0 ? (
        <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('empty')}</p>
      ) : (
        <div className='flex flex-col gap-6'>
          <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
            {versions.map((version) => (
              <li key={version.id} className='flex min-h-[44px] items-center gap-3 px-3 py-1.5'>
                <span className='text-[var(--text-body)] text-small'>
                  {t('version', { version: version.version })}
                </span>
                <span className='text-[var(--text-muted)] text-caption'>
                  {format.dateTime(new Date(version.createdAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                {version.isActive && (
                  <Badge variant='green' size='sm'>
                    {t('active')}
                  </Badge>
                )}
                {!version.isActive && !readOnly && (
                  <Chip className='ml-auto' onClick={() => setPendingVersion(version.version)}>
                    {t('activate')}
                  </Chip>
                )}
              </li>
            ))}
          </ul>
          {versions.length > 1 && (
            <div className='flex flex-col gap-3'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField label={t('compareFrom')}>
                  <ChipCombobox
                    options={versionOptions}
                    value={from === null ? undefined : String(from)}
                    onChange={(value) => setCompareFrom(Number(value))}
                  />
                </FormField>
                <FormField label={t('compareTo')}>
                  <ChipCombobox
                    options={versionOptions}
                    value={to === null ? undefined : String(to)}
                    onChange={(value) => setCompareTo(Number(value))}
                  />
                </FormField>
              </div>
              {from !== null && to !== null && (
                <VersionDiff
                  workspaceId={workspaceId}
                  workflowId={workflowId}
                  from={from}
                  to={to}
                />
              )}
            </div>
          )}
        </div>
      )}
      <ChipConfirmModal
        open={pendingVersion !== null}
        onOpenChange={(open) => {
          if (!open && !isActivating && !isReverting) setPendingVersion(null)
        }}
        title={t('activateTitle', { version: pendingVersion ?? 0 })}
        text={t('activateText')}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('activate'),
          variant: 'primary',
          pending: isActivating || isReverting,
          disabled: isActivating || isReverting,
          onClick: () => void handleActivate(),
        }}
      />
    </SettingsSection>
  )
}

interface VersionDiffProps {
  workspaceId: string
  workflowId: string
  from: number
  to: number
}

/** Field-by-field differences between two versions, or « non comparable » outside the agent shape. */
function VersionDiff({ workspaceId, workflowId, from, to }: VersionDiffProps) {
  const t = useTranslations('agents')
  const { data: fromState, isLoading: fromLoading } = useDeploymentVersionState(workflowId, from)
  const { data: toState, isLoading: toLoading } = useDeploymentVersionState(workflowId, to)
  const { data: bases } = useKnowledgeBasesQuery(workspaceId)

  const baseNames = useMemo(
    () => new Map((bases ?? []).map((base) => [base.id, base.name])),
    [bases]
  )
  const { data: workflows } = useWorkflows(workspaceId)
  const agentNames = useMemo(
    () => new Map((workflows ?? []).map((workflow) => [workflow.id, workflow.name])),
    [workflows]
  )
  const { data: prompts } = useNexoraPrompts(workspaceId)
  const promptNames = useMemo(
    () => new Map((prompts ?? []).map((prompt) => [prompt.id, prompt.name])),
    [prompts]
  )

  if (fromLoading || toLoading) {
    return (
      <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('versions.loadingVersion')}</p>
    )
  }

  const before = readAgentWorkflow(fromState)
  const after = readAgentWorkflow(toState)
  if (!before || !after) {
    return (
      <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('versions.notComparable')}</p>
    )
  }

  const changes = diffAgentVersions(before, after)
  if (changes.length === 0) {
    return <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('versions.noChanges')}</p>
  }

  const show = (config: AgentConfig, field: keyof AgentConfig): string => {
    switch (field) {
      case 'tools':
        return (
          config.tools.map((tool) => tool.params?.toolName ?? tool.title ?? tool.type).join(', ') ||
          t('editor.tools.none')
        )
      case 'knowledgeBaseIds':
        return (
          config.knowledgeBaseIds.map((id) => baseNames.get(id) ?? id).join(', ') ||
          t('editor.knowledge.none')
        )
      case 'memory':
        return config.memory ? t('editor.memory.on') : t('editor.memory.off')
      case 'codeInterpreter':
      case 'webSearch':
        return config[field] ? t('editor.memory.on') : t('editor.memory.off')
      case 'model':
        return config.model.replace(/^vllm\//, '')
      case 'reasoningEffort':
        return t(
          `playground.efforts.${config.reasoningEffort === 'auto' ? 'default' : config.reasoningEffort}`
        )
      case 'handoffs':
        return (
          config.handoffs
            .map(
              (handoff) =>
                `${agentNames.get(handoff.agentId) ?? handoff.agentId} (${t(
                  handoff.mode === 'reply'
                    ? 'editor.handoffs.modeReply'
                    : 'editor.handoffs.modeTransfer'
                )})`
            )
            .join(', ') || t('editor.handoffs.none')
        )
      case 'skills':
        return (
          config.skills.map((skill) => skill.name || skill.skillId).join(', ') ||
          t('editor.skills.none')
        )
      case 'instructionsPrompt':
        return config.instructionsPrompt
          ? t('editor.instructionsPrompt.versionSummary', {
              name:
                promptNames.get(config.instructionsPrompt.promptId) ??
                config.instructionsPrompt.promptId,
              label: config.instructionsPrompt.label,
            })
          : t('editor.instructionsPrompt.written')
      default:
        return config[field]
    }
  }

  return (
    <div className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
      {changes.map(({ field }) => (
        <div key={field} className='flex flex-col gap-2 px-3 py-2.5'>
          <span className='text-[var(--text-body)] text-small'>{t(`editor.fields.${field}`)}</span>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='flex flex-col gap-1'>
              <span className='text-[var(--text-muted)] text-caption'>{t('versions.before')}</span>
              <p className='whitespace-pre-wrap break-words text-[var(--text-body)] text-small'>
                {show(before, field)}
              </p>
            </div>
            <div className='flex flex-col gap-1'>
              <span className='text-[var(--text-muted)] text-caption'>{t('versions.after')}</span>
              <p className='whitespace-pre-wrap break-words text-[var(--text-body)] text-small'>
                {show(after, field)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
