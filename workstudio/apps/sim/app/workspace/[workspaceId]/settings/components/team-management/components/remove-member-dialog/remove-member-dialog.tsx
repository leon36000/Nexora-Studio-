import { ChipConfirmModal } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { formatQuotedNameList } from '@sim/utils/string'
import { useTranslations } from 'next-intl'

const MAX_LISTED_CREDENTIALS = 3

interface RemoveMemberDialogProps {
  open: boolean
  memberName: string
  isSelfRemoval?: boolean
  isExternalRemoval?: boolean
  /**
   * Display names of identity-bound credentials (OAuth accounts, personal env
   * keys) the member owns in organization workspaces. These stop working on
   * removal and must be reconnected by a remaining member — disclosed here,
   * never blocking.
   */
  breakingCredentials?: string[]
  /** The impact check is still loading — confirm is held until it resolves. */
  credentialImpactPending?: boolean
  /** The impact check failed — removal stays possible, with a caution shown. */
  credentialImpactFailed?: boolean
  isSubmitting?: boolean
  error?: Error | null
  onOpenChange: (open: boolean) => void
  onConfirmRemove: () => Promise<void> // i18n-ignore: type annotation, not UI text
  onCancel: () => void
}

export function RemoveMemberDialog({
  open,
  memberName,
  error,
  onOpenChange,
  onConfirmRemove,
  onCancel,
  isSelfRemoval = false,
  isExternalRemoval = false,
  breakingCredentials = [],
  credentialImpactPending = false,
  credentialImpactFailed = false,
  isSubmitting = false,
}: RemoveMemberDialogProps) {
  const t = useTranslations('settings.teamManagement.removeMemberDialog')
  const tShared = useTranslations('settings.shared')
  const title = isSelfRemoval
    ? t('leaveTitle')
    : isExternalRemoval
      ? t('removeExternalTitle')
      : t('removeTeamMemberTitle')

  const errorMessage = error ? getErrorMessage(error) || t('removeFailed') : null

  const credentialWarning = credentialImpactFailed
    ? isSelfRemoval
      ? t('impactCheckFailedSelf')
      : t('impactCheckFailedOther')
    : breakingCredentials.length > 0
      ? t(isSelfRemoval ? 'breakingCredentialsSelf' : 'breakingCredentialsOther', {
          count: breakingCredentials.length,
          names: formatQuotedNameList(breakingCredentials, MAX_LISTED_CREDENTIALS),
        })
      : null

  return (
    <ChipConfirmModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
        onOpenChange(next)
      }}
      srTitle={title}
      title={title}
      text={
        isSelfRemoval
          ? t('leaveConfirm')
          : isExternalRemoval
            ? [t('removePrefix'), { text: memberName, bold: true }, t('removeExternalSuffix')]
            : [t('removePrefix'), { text: memberName, bold: true }, t('removeTeamSuffix')]
      }
      confirm={{
        label: isSelfRemoval ? t('leaveTitle') : tShared('remove'),
        onClick: () => onConfirmRemove(),
        pending: isSubmitting,
        /**
         * `disabled`, not `pending`: the impact check is a precondition, and
         * `pending` means "the confirm is in flight" — the primitive also
         * disables the dismiss button while pending, which must stay available
         * while we are merely loading the disclosure.
         */
        disabled: credentialImpactPending,
      }}
    >
      {credentialImpactPending ? (
        <p className='mt-1 px-2 text-[var(--text-muted)] text-caption'>{t('checkingImpact')}</p>
      ) : credentialWarning ? (
        <p className='mt-1 px-2 text-[var(--text-muted)] text-caption'>{credentialWarning}</p>
      ) : null}
      {errorMessage ? (
        <p role='alert' className='mt-1 px-2 text-[var(--text-error)] text-caption'>
          {errorMessage}
        </p>
      ) : null}
    </ChipConfirmModal>
  )
}
