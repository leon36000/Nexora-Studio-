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

interface CreateWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => Promise<void> // i18n-ignore: type annotation
  isCreating: boolean
}

/**
 * Modal for naming a new workspace before creation.
 */
export function CreateWorkspaceModal({
  open,
  onOpenChange,
  onConfirm,
  isCreating,
}: CreateWorkspaceModalProps) {
  const t = useTranslations('shell.createWorkspaceModal')
  const title = t('title')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setName('')
      setError(null)
    }
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed || isCreating) return
    try {
      await onConfirm(trimmed)
    } catch (err) {
      setError(getErrorMessage(err, t('createFailed')))
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setError(null)
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={title}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{title}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={handleNameChange}
          placeholder={t('namePlaceholder')}
          maxLength={100}
          autoComplete='off'
          disabled={isCreating}
          required
        />
        <ChipModalError>{error ?? undefined}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        cancelDisabled={isCreating}
        primaryAction={{
          label: isCreating ? t('creating') : t('create'),
          onClick: () => void handleSubmit(),
          disabled: !name.trim() || isCreating,
        }}
      />
    </ChipModal>
  )
}
