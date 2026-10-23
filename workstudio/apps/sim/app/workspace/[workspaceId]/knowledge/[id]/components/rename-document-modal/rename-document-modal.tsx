'use client'

import { useRef, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'

const logger = createLogger('RenameDocumentModal')

interface RenameDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  initialName: string
  onSave: (documentId: string, newName: string) => Promise<void> // i18n-ignore: TypeScript type, not interface text
}

/**
 * Modal for renaming a document.
 * Only changes the display name, not the underlying storage key.
 */
export function RenameDocumentModal({
  open,
  onOpenChange,
  documentId,
  initialName,
  onSave,
}: RenameDocumentModalProps) {
  const t = useTranslations('knowledge.renameDocument')
  const [name, setName] = useState(initialName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form fields when the modal opens (open transitions false → true).
  const prevOpenRef = useRef(open)
  if (prevOpenRef.current !== open) {
    prevOpenRef.current = open
    if (open) {
      setName(initialName)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError(t('nameRequired'))
      return
    }

    if (trimmedName === initialName) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(documentId, trimmedName)
      onOpenChange(false)
    } catch (err) {
      logger.error('Error renaming document:', err)
      setError(getErrorMessage(err, t('failed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('name')}
          value={name}
          onChange={(value) => {
            setName(value)
            setError(null)
          }}
          placeholder={t('placeholder')}
          maxLength={255}
          autoComplete='off'
          disabled={isSubmitting}
          required
        />
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('cancel')}
        onCancel={() => onOpenChange(false)}
        cancelDisabled={isSubmitting}
        primaryAction={{
          label: isSubmitting ? t('renaming') : t('rename'),
          onClick: () => void handleSubmit(),
          disabled: isSubmitting || !name?.trim() || name.trim() === initialName,
        }}
      />
    </ChipModal>
  )
}
