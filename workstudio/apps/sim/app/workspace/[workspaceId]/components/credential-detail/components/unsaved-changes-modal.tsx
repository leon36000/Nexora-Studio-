import { ChipConfirmModal } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface UnsavedChangesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Confirmed discard: abandon edits and continue (navigate away / close). */
  onDiscard: () => void
}

/**
 * Confirmation shown when leaving a surface with unsaved edits. Shared by the
 * credential detail surfaces and the secrets list so the copy and affordances
 * stay identical.
 */
export function UnsavedChangesModal({ open, onOpenChange, onDiscard }: UnsavedChangesModalProps) {
  const t = useTranslations('shell.credentialDetail.unsavedChanges')
  return (
    <ChipConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      srTitle={t('title')}
      title={t('title')}
      text={t('text')}
      dismissLabel={t('keepEditing')}
      confirm={{ label: t('discard'), onClick: onDiscard }}
    />
  )
}
