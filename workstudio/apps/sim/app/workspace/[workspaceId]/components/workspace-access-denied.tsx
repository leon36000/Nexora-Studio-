import { ChipLink } from '@sim/emcn'
import { CircleAlert } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { WORKSPACES_PATH } from '@/lib/navigation/paths'
import { DesktopTitleBarLane } from '@/app/_shell/desktop-title-bar'

export function WorkspaceAccessDenied() {
  const t = useTranslations('shell.workspaceAccessDenied')
  return (
    <main className='desktop-title-bar-page flex items-center justify-center bg-[var(--surface-1)] p-6'>
      <DesktopTitleBarLane />
      <div className='flex max-w-md flex-col items-center gap-3 text-center'>
        <div className='flex size-10 items-center justify-center rounded-full bg-[var(--surface-3)]'>
          <CircleAlert className='size-[18px] text-[var(--text-icon)]' aria-hidden />
        </div>
        <div className='space-y-1'>
          <h1 className='text-[var(--text-primary)] text-lg'>{t('title')}</h1>
          <p className='text-[var(--text-muted)] text-sm'>{t('description')}</p>
        </div>
        <ChipLink href={WORKSPACES_PATH} variant='primary'>
          {t('viewWorkspaces')}
        </ChipLink>
      </div>
    </main>
  )
}
