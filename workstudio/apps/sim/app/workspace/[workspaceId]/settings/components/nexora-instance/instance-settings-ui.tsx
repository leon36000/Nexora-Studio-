'use client'

import { type ReactNode, useState } from 'react'
import { Chip, ChipConfirmModal, ChipInput, type ChipInputProps, Label } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  getNexoraSettingsErrorCode,
  NexoraRestartTimeoutError,
  useApplyNexoraSettings,
} from '@/hooks/queries/nexora-settings'

interface SettingsTextFieldProps extends Omit<ChipInputProps, 'id' | 'onChange'> {
  id: string
  label: string
  hint?: ReactNode
  onValueChange: (value: string) => void
}

/** One labeled field of an instance settings form; `hint` sits under the input. */
export function SettingsTextField({
  id,
  label,
  hint,
  onValueChange,
  ...inputProps
}: SettingsTextFieldProps) {
  return (
    <div className='flex flex-col gap-[9px]'>
      <Label htmlFor={id}>{label}</Label>
      <ChipInput
        id={id}
        autoComplete='off'
        data-lpignore='true'
        onChange={(event) => onValueChange(event.target.value)}
        {...inputProps}
      />
      {hint && <p className='text-[var(--text-muted)] text-caption'>{hint}</p>}
    </div>
  )
}

interface ApplySettingsNoticeProps {
  /** Saved changes the running WorkStudio has not applied yet. */
  pending: boolean
  /** Unsaved edits on screen: they must be saved before applying. */
  dirty: boolean
}

/**
 * « Appliquer »: single sign-on, e-mail and sign-up domains are read when WorkStudio starts, so
 * applying them restarts it. Shows the waiting state while it comes back, then reloads the page.
 */
export function ApplySettingsNotice({ pending, dirty }: ApplySettingsNoticeProps) {
  const t = useTranslations('settings.instanceSettings.apply')
  const tShared = useTranslations('settings.shared')
  const tErrors = useTranslations('settings.instanceSettings.errors')
  const apply = useApplyNexoraSettings()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!pending && apply.isIdle) return null

  const handleApply = () => {
    setConfirmOpen(false)
    apply.mutate(undefined, { onSuccess: () => window.location.reload() })
  }

  let message: string
  if (apply.isPending) message = t('restarting')
  else if (apply.isError) {
    const code = getNexoraSettingsErrorCode(apply.error)
    message =
      apply.error instanceof NexoraRestartTimeoutError
        ? t('timeout')
        : code === 'not-supervised'
          ? t('notSupervised')
          : code === 'restart-in-progress' || code === 'nothing-pending'
            ? tErrors(code)
            : t('failed')
  } else message = dirty ? t('saveFirst') : t('pending')

  return (
    <>
      <div
        role='status'
        className='flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5'
      >
        <p className='text-[var(--text-body)] text-small'>{message}</p>
        {!apply.isPending && pending && (
          <Chip variant='primary' disabled={dirty} onClick={() => setConfirmOpen(true)}>
            {t('action')}
          </Chip>
        )}
      </div>
      <ChipConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('dialog.title')}
        text={[t('dialog.text'), ' ', t('dialog.executions')]}
        dismissLabel={tShared('cancel')}
        confirm={{ label: t('dialog.confirm'), variant: 'primary', onClick: handleApply }}
      />
    </>
  )
}
