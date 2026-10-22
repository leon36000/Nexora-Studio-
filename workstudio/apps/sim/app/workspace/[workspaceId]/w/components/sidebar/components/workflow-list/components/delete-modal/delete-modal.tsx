'use client'

import { useState } from 'react'
import { ChipConfirmModal, type ChipConfirmTextSegment, ChipModalField } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface DeleteModalProps {
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
   * Type of item being deleted
   * - 'mixed' is used when both workflows and folders are selected
   */
  itemType: 'workflow' | 'folder' | 'workspace' | 'mixed' | 'task'
  /**
   * Name(s) of the item(s) being deleted (optional, for display)
   * Can be a single name or an array of names for multiple items
   */
  itemName?: string | string[]
}

/** Item types that land in Recently Deleted and can be restored from Settings. */
const RESTORABLE_TYPES = new Set<string>(['workflow', 'folder', 'mixed', 'task'])

/**
 * Reusable delete confirmation modal for workflow, folder, and workspace items.
 * Displays a warning message and confirmation buttons.
 *
 * @param props - Component props
 * @returns Delete confirmation modal
 */
export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemType,
  itemName,
}: DeleteModalProps) {
  const t = useTranslations('shell.deleteModal')
  const [confirmationText, setConfirmationText] = useState('')
  const [prevIsOpen, setPrevIsOpen] = useState(false)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setConfirmationText('')
    }
  }

  const isMultiple = Array.isArray(itemName) && itemName.length > 1
  const isSingle = !isMultiple

  const displayNames = Array.isArray(itemName) ? itemName : itemName ? [itemName] : []

  const isWorkspace = itemType === 'workspace'
  const workspaceName = isWorkspace && displayNames.length > 0 ? displayNames[0] : ''
  const isConfirmed = !isWorkspace || confirmationText === workspaceName
  const defaultAction = isWorkspace
    ? 'none'
    : isSingle && itemType === 'task'
      ? 'confirm'
      : 'dismiss'

  let title = ''
  if (itemType === 'workflow') {
    title = isMultiple ? t('titles.workflows') : t('titles.workflow')
  } else if (itemType === 'folder') {
    title = isMultiple ? t('titles.folders') : t('titles.folder')
  } else if (itemType === 'task') {
    title = isMultiple ? t('titles.chats') : t('titles.chat')
  } else if (itemType === 'mixed') {
    title = t('titles.items')
  } else {
    title = t('titles.workspace')
  }

  const buildDescriptionSegments = (): ChipConfirmTextSegment[] => {
    if (itemType === 'workflow') {
      const warning = {
        text: t('warnings.workflow'),
        error: true,
      }
      if (isMultiple) {
        return [
          t('confirmPrefix'),
          { text: displayNames.join(', '), bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      if (isSingle && displayNames.length > 0) {
        return [
          t('confirmPrefix'),
          { text: displayNames[0], bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      return [t('confirmThisWorkflow'), warning]
    }

    if (itemType === 'folder') {
      if (isMultiple) {
        return [
          t('confirmPrefix'),
          { text: displayNames.join(', '), bold: true },
          t('confirmSuffix'),
          {
            text: t('warnings.folders'),
            error: true,
          },
        ]
      }
      const warning = {
        text: t('warnings.folder'),
        error: true,
      }
      if (isSingle && displayNames.length > 0) {
        return [
          t('confirmPrefix'),
          { text: displayNames[0], bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      return [t('confirmThisFolder'), warning]
    }

    if (itemType === 'task') {
      const warning = {
        text: t('warnings.chat'),
        error: true,
      }
      if (isMultiple) {
        return [
          t('confirmPrefix'),
          { text: t('chatCount', { count: displayNames.length }), bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      if (isSingle && displayNames.length > 0) {
        return [
          t('confirmPrefix'),
          { text: displayNames[0], bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      return [t('confirmThisChat'), warning]
    }

    if (itemType === 'mixed') {
      const warning = {
        text: t('warnings.mixed'),
        error: true,
      }
      if (displayNames.length > 0) {
        return [
          t('confirmPrefix'),
          { text: displayNames.join(', '), bold: true },
          t('confirmSuffix'),
          warning,
        ]
      }
      return [t('confirmSelectedItems'), warning]
    }

    const workspaceWarning = {
      text: t('warnings.workspace'),
      error: true,
    }
    if (isSingle && displayNames.length > 0) {
      return [
        t('confirmPrefix'),
        { text: displayNames[0], bold: true },
        t('confirmSuffix'),
        workspaceWarning,
      ]
    }
    return [t('confirmThisWorkspace'), workspaceWarning]
  }

  const handleClose = () => {
    setConfirmationText('')
    onClose()
  }

  return (
    <ChipConfirmModal
      open={isOpen}
      onOpenChange={handleClose}
      srTitle={title}
      title={title}
      defaultAction={defaultAction}
      text={[
        ...buildDescriptionSegments(),
        ' ',
        RESTORABLE_TYPES.has(itemType) ? t('restorable') : t('irreversible'),
      ]}
      confirm={{
        label: t('delete'),
        onClick: onConfirm,
        pending: isDeleting,
        pendingLabel: t('deleting'),
        disabled: !isConfirmed,
      }}
    >
      {isWorkspace && workspaceName && (
        <ChipModalField
          type='input'
          title={
            <span>
              {t.rich('typeToConfirm', {
                name: workspaceName,
                highlight: (chunks) => <span className='text-[var(--text-primary)]'>{chunks}</span>,
              })}
            </span>
          }
          value={confirmationText}
          onChange={setConfirmationText}
          placeholder={workspaceName}
        />
      )}
    </ChipConfirmModal>
  )
}
