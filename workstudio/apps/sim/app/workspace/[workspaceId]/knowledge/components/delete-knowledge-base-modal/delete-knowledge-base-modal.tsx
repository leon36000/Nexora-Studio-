'use client'

import { memo } from 'react'
import { ChipConfirmModal } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface DeleteKnowledgeBaseModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * Callback when delete is confirmed
   */
  onConfirm: () => void
  /**
   * Whether the delete operation is in progress
   */
  isDeleting: boolean
  /**
   * Name of the knowledge base being deleted
   */
  knowledgeBaseName?: string
}

/**
 * Delete confirmation modal for knowledge base items.
 * Displays a warning message and confirmation buttons.
 */
export const DeleteKnowledgeBaseModal = memo(function DeleteKnowledgeBaseModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  knowledgeBaseName,
}: DeleteKnowledgeBaseModalProps) {
  const t = useTranslations('knowledge.deleteBase')
  return (
    <ChipConfirmModal
      open={isOpen}
      onOpenChange={onClose}
      srTitle={t('title')}
      title={t('title')}
      defaultAction='dismiss'
      text={
        knowledgeBaseName
          ? [
              t('confirmNamedPrefix'),
              { text: knowledgeBaseName, bold: true },
              t('confirmNamedSuffix'),
              {
                text: t('warning'),
                error: true,
              },
              t('restoreHint'),
            ]
          : [
              t('confirmUnnamed'),
              {
                text: t('warning'),
                error: true,
              },
              t('restoreHint'),
            ]
      }
      confirm={{
        label: t('confirm'),
        onClick: onConfirm,
        pending: isDeleting,
        pendingLabel: t('pending'),
      }}
    />
  )
})
