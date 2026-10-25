'use client'

import { Chip, ChipDropdown, ChipInput, ChipSwitch } from '@sim/emcn'
import { Plus, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { NexoraEvalTargetInput } from '@/lib/api/contracts/nexora-evaluations'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import { useAssistantAgents } from '@/hooks/queries/nexora-assistant'
import { useNexoraPrompts } from '@/hooks/queries/nexora-prompts'
import { useProviderModels } from '@/hooks/queries/providers'

const TARGET_KINDS = ['model', 'prompt', 'agent'] as const
const SELECTORS = ['production', 'test', 'latest'] as const
const MAX_TARGETS = 8

type Kind = (typeof TARGET_KINDS)[number]
type Selector = (typeof SELECTORS)[number]

function isKind(value: string): value is Kind {
  return TARGET_KINDS.some((kind) => kind === value)
}

function isSelector(value: string): value is Selector {
  return SELECTORS.some((selector) => selector === value)
}

interface TargetsFieldProps {
  workspaceId: string
  value: NexoraEvalTargetInput[]
  onChange: (value: NexoraEvalTargetInput[]) => void
  disabled?: boolean
}

/** A model id the Playground offers: the instance's own router (`vllm/…`). */
const DEFAULT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`

/** An empty target of a kind, with the first sensible choices filled in. */
export function emptyTarget(kind: Kind, defaults: { promptId?: string; agentId?: string }) {
  if (kind === 'prompt') {
    return {
      kind,
      model: DEFAULT_MODEL,
      promptId: defaults.promptId ?? '',
      selector: 'production' as const,
    }
  }
  if (kind === 'agent') return { kind, workflowId: defaults.agentId ?? '' }
  return { kind, model: DEFAULT_MODEL, system: '' }
}

/** Whether every target is complete enough to be launched. */
export function targetsComplete(targets: readonly NexoraEvalTargetInput[]): boolean {
  return (
    targets.length > 0 &&
    targets.every((target) => {
      if (target.kind === 'agent') return target.workflowId.length > 0
      if (target.kind === 'prompt') return target.promptId.length > 0 && target.model.length > 0
      return target.model.length > 0
    })
  )
}

/**
 * What a campaign evaluates: up to eight targets, each a model, a version of a prompt run on a
 * model, or a published agent. Prompt versions are pinned when the campaign starts.
 */
export function TargetsField({ workspaceId, value, onChange, disabled }: TargetsFieldProps) {
  const t = useTranslations('evaluations.targets')
  const { data: modelList } = useProviderModels('vllm')
  const { data: prompts } = useNexoraPrompts(workspaceId)
  const { data: agents } = useAssistantAgents(workspaceId)

  const modelOptions = [...new Set([DEFAULT_MODEL, ...(modelList?.models ?? [])])].map((model) => ({
    value: model,
    label: model.replace(/^vllm\//, ''),
  }))
  const promptOptions = (prompts ?? []).map((prompt) => ({ value: prompt.id, label: prompt.name }))
  const agentOptions = (agents ?? []).map((agent) => ({
    value: agent.workflowId,
    label: agent.name,
  }))

  const update = (index: number, target: NexoraEvalTargetInput) =>
    onChange(value.map((entry, position) => (position === index ? target : entry)))

  const changeKind = (index: number, kind: Kind) =>
    update(
      index,
      emptyTarget(kind, {
        promptId: promptOptions[0]?.value,
        agentId: agentOptions[0]?.value,
      })
    )

  return (
    <div className='flex flex-col gap-3'>
      {value.map((target, index) => (
        <div
          key={`${target.kind}-${index}`}
          className='flex flex-col gap-2 rounded-lg border border-[var(--border)] p-2'
        >
          <div className='flex items-center justify-between gap-2'>
            <ChipSwitch
              size='compact'
              aria-label={t('kind')}
              disabled={disabled}
              options={TARGET_KINDS.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
              value={target.kind}
              onChange={(kind) => isKind(kind) && changeKind(index, kind)}
            />
            {value.length > 1 && (
              <Chip
                aria-label={t('remove')}
                leftIcon={X}
                disabled={disabled}
                onClick={() => onChange(value.filter((_, position) => position !== index))}
              />
            )}
          </div>
          {target.kind === 'model' && (
            <>
              <ChipDropdown
                value={target.model}
                onChange={(model) => update(index, { ...target, model })}
                options={modelOptions}
                disabled={disabled}
              />
              <ChipInput
                placeholder={t('system')}
                value={target.system ?? ''}
                onChange={(event) => update(index, { ...target, system: event.target.value })}
                disabled={disabled}
              />
            </>
          )}
          {target.kind === 'prompt' && (
            <div className='flex flex-wrap gap-1'>
              <ChipDropdown
                value={target.promptId}
                onChange={(promptId) => update(index, { ...target, promptId })}
                options={promptOptions}
                placeholder={t('choosePrompt')}
                disabled={disabled}
              />
              <ChipDropdown
                value={target.selector ?? 'production'}
                onChange={(selector) =>
                  isSelector(selector) && update(index, { ...target, selector, version: null })
                }
                options={SELECTORS.map((selector) => ({
                  value: selector,
                  label: t(`selectors.${selector}`),
                }))}
                disabled={disabled}
              />
              <ChipDropdown
                value={target.model}
                onChange={(model) => update(index, { ...target, model })}
                options={modelOptions}
                disabled={disabled}
              />
            </div>
          )}
          {target.kind === 'agent' && (
            <ChipDropdown
              value={target.workflowId}
              onChange={(workflowId) => update(index, { ...target, workflowId })}
              options={agentOptions}
              placeholder={t('chooseAgent')}
              disabled={disabled}
            />
          )}
        </div>
      ))}
      {value.length < MAX_TARGETS && (
        <Chip
          leftIcon={Plus}
          className='self-start'
          disabled={disabled}
          onClick={() =>
            onChange([
              ...value,
              emptyTarget('model', {
                promptId: promptOptions[0]?.value,
                agentId: agentOptions[0]?.value,
              }),
            ])
          }
        >
          {t('add')}
        </Chip>
      )}
    </div>
  )
}
