'use client'

import { useState } from 'react'
import { Chip, ChipInput, ChipSelect, ChipTextarea, toast } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { NexoraPromptVersion } from '@/lib/api/contracts/nexora-prompts'
import {
  PROMPT_VARIABLE_TYPES,
  type PromptVariable,
  reconcileVariables,
} from '@/lib/nexora/prompts/template'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { useCreateNexoraPromptVersion } from '@/hooks/queries/nexora-prompts'

interface VersionEditorProps {
  workspaceId: string
  promptId: string
  /** The version the new one starts from. */
  base: NexoraPromptVersion
  onSaved: (version: number) => void
}

/**
 * Writes the next version: text, typed variables (one per `{{name}}` of the text), note. Saving
 * never moves a label: agents keep their version until someone promotes the new one.
 */
export function VersionEditor({ workspaceId, promptId, base, onSaved }: VersionEditorProps) {
  const t = useTranslations('agents.prompts')
  const tTypes = useTranslations('agents.editor.instructionsPrompt.types')
  const { mutateAsync: saveVersion, isPending } = useCreateNexoraPromptVersion()
  const [content, setContent] = useState(base.content)
  const [declared, setDeclared] = useState<PromptVariable[]>(base.variables)
  const [note, setNote] = useState('')

  const variables = reconcileVariables(content, declared)
  const unchanged =
    content === base.content && JSON.stringify(variables) === JSON.stringify(base.variables)

  const updateVariable = (name: string, change: Partial<PromptVariable>) => {
    setDeclared((previous) => {
      const current = reconcileVariables(content, previous)
      return current.map((variable) =>
        variable.name === name ? { ...variable, ...change } : variable
      )
    })
  }

  const handleSave = async () => {
    try {
      const { version } = await saveVersion({
        workspaceId,
        promptId,
        content,
        variables: variables.map((variable) => ({
          name: variable.name,
          type: variable.type,
          ...(variable.description ? { description: variable.description } : {}),
          ...(variable.defaultValue ? { defaultValue: variable.defaultValue } : {}),
        })),
        note: note.trim(),
      })
      setNote('')
      toast.success(t('versionSaved', { version: version.version }))
      onSaved(version.version)
    } catch (error) {
      toast.error(getErrorMessage(error, t('versionFailed')))
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <FormField label={t('fields.content')} htmlFor='prompt-content' hint={t('variablesHint')}>
        <ChipTextarea
          id='prompt-content'
          value={content}
          rows={10}
          resizable
          disabled={isPending}
          onChange={(event) => setContent(event.target.value)}
        />
      </FormField>
      {variables.length > 0 && (
        <FormField label={t('variables')}>
          <div className='flex flex-col gap-2'>
            {variables.map((variable) => (
              <div
                key={variable.name}
                className='grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_1fr]'
              >
                <span className='self-center pl-0.5 font-mono text-[var(--text-body)] text-small'>
                  {`{{${variable.name}}}`}
                </span>
                <ChipSelect
                  aria-label={t('variableType', { name: variable.name })}
                  fullWidth
                  disabled={isPending}
                  value={variable.type}
                  onChange={(value) => {
                    const type = PROMPT_VARIABLE_TYPES.find((entry) => entry === value)
                    if (type) updateVariable(variable.name, { type })
                  }}
                  options={PROMPT_VARIABLE_TYPES.map((type) => ({
                    value: type,
                    label: tTypes(type),
                  }))}
                />
                <ChipInput
                  aria-label={t('variableDefault', { name: variable.name })}
                  placeholder={t('defaultValue')}
                  value={variable.defaultValue ?? ''}
                  disabled={isPending}
                  onChange={(event) =>
                    updateVariable(variable.name, { defaultValue: event.target.value })
                  }
                />
              </div>
            ))}
          </div>
        </FormField>
      )}
      <FormField label={t('fields.note')} htmlFor='prompt-note'>
        <ChipInput
          id='prompt-note'
          value={note}
          disabled={isPending}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormField>
      <Chip
        variant='primary'
        className='self-start'
        disabled={isPending || unchanged || !content.trim()}
        onClick={() => void handleSave()}
      >
        {t('saveVersion')}
      </Chip>
    </div>
  )
}
