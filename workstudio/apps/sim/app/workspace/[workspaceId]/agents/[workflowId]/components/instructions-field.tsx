'use client'

import { ChipInput, ChipLink, ChipSelect, ChipSwitch, ChipTextarea } from '@sim/emcn'
import { FileText } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { AgentInstructionsPrompt } from '@/lib/nexora/agents'
import { PROMPT_SELECTORS, type PromptSelector } from '@/lib/nexora/prompts/template'
import { useNexoraPrompt, useNexoraPrompts } from '@/hooks/queries/nexora-prompts'

type InstructionsSource = 'text' | 'prompt'

interface InstructionsFieldProps {
  workspaceId: string
  instructions: string
  prompt: AgentInstructionsPrompt | null
  disabled: boolean
  onInstructionsChange: (instructions: string) => void
  onPromptChange: (prompt: AgentInstructionsPrompt | null) => void
}

/**
 * The agent's instructions: written here, or read at run time from a versioned prompt of the
 * workspace (« Consignes : prompt X @production »). Moving that label on the Prompts page changes
 * the published agent's answers without publishing it again.
 */
export function InstructionsField({
  workspaceId,
  instructions,
  prompt,
  disabled,
  onInstructionsChange,
  onPromptChange,
}: InstructionsFieldProps) {
  const t = useTranslations('agents.editor.instructionsPrompt')
  const { data: prompts } = useNexoraPrompts(workspaceId)
  const { data: detail } = useNexoraPrompt(workspaceId, prompt?.promptId ?? null)
  const source: InstructionsSource = prompt ? 'prompt' : 'text'

  const selected = prompts?.find((entry) => entry.id === prompt?.promptId)
  const versionNumber = prompt
    ? prompt.label === 'latest'
      ? detail?.latestVersion
      : detail?.labels[prompt.label]
    : undefined
  const version = detail?.versions.find((entry) => entry.version === versionNumber)

  const changeSource = (next: InstructionsSource) => {
    if (next === 'text') onPromptChange(null)
    else if (prompts?.[0]) {
      onPromptChange({ promptId: prompts[0].id, label: 'production', variables: {} })
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <ChipSwitch
        aria-label={t('source')}
        value={source}
        disabled={disabled || (source === 'text' && !prompts?.length)}
        onChange={changeSource}
        options={[
          { value: 'text', label: t('written') },
          { value: 'prompt', label: t('fromPrompt') },
        ]}
      />
      {source === 'text' ? (
        <>
          <ChipTextarea
            id='agent-instructions'
            value={instructions}
            disabled={disabled}
            rows={8}
            resizable
            onChange={(event) => onInstructionsChange(event.target.value)}
          />
          {prompts?.length === 0 && (
            <ChipLink href={`/workspace/${workspaceId}/prompts`} leftIcon={FileText}>
              {t('noPrompt')}
            </ChipLink>
          )}
        </>
      ) : (
        prompt && (
          <>
            <div className='flex flex-wrap gap-2'>
              <div className='min-w-[220px] flex-1'>
                <ChipSelect
                  aria-label={t('prompt')}
                  fullWidth
                  searchable
                  disabled={disabled}
                  value={prompt.promptId}
                  placeholder={t('missing')}
                  onChange={(promptId) => onPromptChange({ ...prompt, promptId, variables: {} })}
                  options={(prompts ?? []).map((entry) => ({ value: entry.id, label: entry.name }))}
                />
              </div>
              <div className='w-[200px]'>
                <ChipSelect
                  aria-label={t('label')}
                  fullWidth
                  disabled={disabled}
                  value={prompt.label}
                  onChange={(value) => {
                    const label = PROMPT_SELECTORS.find((entry) => entry === value)
                    if (label) onPromptChange({ ...prompt, label })
                  }}
                  options={PROMPT_SELECTORS.map((label) => ({
                    value: label,
                    label: t(`labels.${label}`),
                  }))}
                />
              </div>
            </div>
            <p className='pl-0.5 text-[var(--text-muted)] text-caption'>
              {selected
                ? t('summary', {
                    name: selected.name,
                    label: labelText(prompt.label, t),
                    version: versionNumber ?? '—',
                  })
                : t('missing')}
            </p>
            {version?.variables.map((variable) => (
              <div key={variable.name} className='flex flex-col gap-1.5'>
                <label
                  htmlFor={`agent-prompt-variable-${variable.name}`}
                  className='pl-0.5 text-[var(--text-muted)] text-small'
                >
                  {`{{${variable.name}}}`} · {t(`types.${variable.type}`)}
                </label>
                <ChipInput
                  id={`agent-prompt-variable-${variable.name}`}
                  value={prompt.variables[variable.name] ?? ''}
                  placeholder={variable.defaultValue ?? variable.description ?? ''}
                  disabled={disabled}
                  onChange={(event) =>
                    onPromptChange({
                      ...prompt,
                      variables: { ...prompt.variables, [variable.name]: event.target.value },
                    })
                  }
                />
              </div>
            ))}
          </>
        )
      )}
    </div>
  )
}

function labelText(label: PromptSelector, t: (key: string) => string): string {
  return label === 'latest' ? t('labels.latest') : `@${label}`
}
