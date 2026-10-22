'use client'

import { memo } from 'react'
import { ChipConfirmModal } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName?: string
  fileCount: number
  folderCount: number
  onDelete: () => void
  isPending: boolean
}

export const DeleteConfirmModal = memo(function DeleteConfirmModal({
  open,
  onOpenChange,
  fileName,
  fileCount,
  folderCount,
  onDelete,
  isPending,
}: DeleteConfirmModalProps) {
  const t = useTranslations('files.deleteModal')
  const totalCount = fileCount + folderCount
  const hasFolders = folderCount > 0
  const title = totalCount > 1 ? t('titleItems') : hasFolders ? t('titleFolder') : t('titleFile')
  const consequence = hasFolders
    ? totalCount > 1
      ? t('consequenceFolders')
      : t('consequenceFolder')
    : totalCount > 1
      ? t('consequenceRestoreMany')
      : t('consequenceRestoreOne')

  return (
    <ChipConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      srTitle={title}
      title={title}
      defaultAction={totalCount === 1 && !hasFolders ? 'confirm' : 'dismiss'}
      text={[
        t('textBefore'),
        fileName ? { text: fileName, bold: true } : t('itemCount', { count: totalCount }),
        t('textAfter', { consequence }),
      ]}
      confirm={{
        label: t('confirm'),
        onClick: onDelete,
        pending: isPending,
        pendingLabel: t('pending'),
      }}
    />
  )
})
