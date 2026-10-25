'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { useCreateNexoraPrompt } from '@/hooks/queries/nexora-prompts'

interface CreatePromptModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Text the new prompt starts from (the Playground's instructions). */
  initialContent?: string
  onCreated: (promptId: string) => void
}

/** Creates a prompt: its version 1 is labelled production and test at once. */
export function CreatePromptModal({
  workspaceId,
  open,
  onOpenChange,
  initialContent = '',
  onCreated,
}: CreatePromptModalProps) {
  const t = useTranslations('agents.prompts')
  const { mutateAsync: createPrompt, isPending } = useCreateNexoraPrompt()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState(initialContent)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName('')
      setDescription('')
      setContent(initialContent)
      setNote('')
      setError(null)
    }
  }

  const canSave = name.trim().length > 0 && content.trim().length > 0 && !isPending

  const handleSave = async () => {
    if (!canSave) return
    try {
      const { prompt } = await createPrompt({
        workspaceId,
        name: name.trim(),
        description: description.trim(),
        content,
        note: note.trim(),
      })
      onOpenChange(false)
      onCreated(prompt.id)
    } catch (caught) {
      setError(getErrorMessage(caught, t('createFailed')))
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('createTitle')} size='lg'>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('createTitle')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('fields.name')}
          value={name}
          onChange={setName}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='input'
          title={t('fields.description')}
          value={description}
          onChange={setDescription}
          disabled={isPending}
        />
        <ChipModalField
          type='textarea'
          title={t('fields.content')}
          value={content}
          onChange={setContent}
          hint={t('variablesHint')}
          required
          disabled={isPending}
        />
        <ChipModalField
          type='input'
          title={t('fields.note')}
          value={note}
          onChange={setNote}
          disabled={isPending}
        />
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: isPending ? t('creating') : t('create'),
          onClick: () => void handleSave(),
          disabled: !canSave,
        }}
      />
    </ChipModal>
  )
}
