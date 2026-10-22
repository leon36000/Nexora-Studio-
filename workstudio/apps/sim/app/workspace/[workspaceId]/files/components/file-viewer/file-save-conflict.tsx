'use client'

import { Chip, toast } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'

interface FileSaveConflictProps {
  isReloading: boolean
  reloadLatestContent: () => Promise<void> // i18n-ignore: type signature
  downloadDraft: () => void
}

/** Keeps both versions recoverable until the user explicitly replaces the local draft. */
export function FileSaveConflict({
  isReloading,
  reloadLatestContent,
  downloadDraft,
}: FileSaveConflictProps) {
  const t = useTranslations('files.saveConflict')
  return (
    <div
      role='alert'
      className='flex shrink-0 flex-wrap items-center gap-2 border-[var(--border)] border-b px-4 py-2 text-[var(--text-body)] text-small'
    >
      <p className='min-w-0 flex-1'>{t('message')}</p>
      <Chip onClick={downloadDraft}>{t('downloadDraft')}</Chip>
      <Chip
        disabled={isReloading}
        onClick={() => {
          void reloadLatestContent().catch((error) =>
            toast.error(getErrorMessage(error, t('reloadFailed')))
          )
        }}
      >
        {isReloading ? t('reloading') : t('discardAndReload')}
      </Chip>
    </div>
  )
}
