'use client'

import { useTranslations } from 'next-intl'

interface NexoraHomeProps {
  workspaceId: string
}

/** Nexora edition: the workspace home page — create, quick starts, platform status, first launch. */
export function NexoraHome({ workspaceId }: NexoraHomeProps) {
  const t = useTranslations('home.nexoraHome')
  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6' data-workspace-id={workspaceId}>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-7 py-10'>
        <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
      </div>
    </div>
  )
}
