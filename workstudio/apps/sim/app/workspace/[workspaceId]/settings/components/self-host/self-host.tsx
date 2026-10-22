'use client'

import { ChipLink } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SITE_URL } from '@/lib/core/utils/urls'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'

/** Chat keys are issued by the managed service, not by this deployment. */
const CHAT_KEYS_HREF = `${SITE_URL}/selfhost/settings/chat-keys`

export function SelfHost() {
  const t = useTranslations('settings.selfHost')
  return (
    <SettingsPanel>
      <div className='flex items-center justify-between px-2'>
        <div className='flex flex-col justify-center gap-[1px]'>
          <span className='text-[var(--text-body)] text-sm'>{t('chatKeys')}</span>
          <span className='text-[var(--text-muted)] text-caption'>{t('chatKeysDescription')}</span>
        </div>
        <ChipLink href={CHAT_KEYS_HREF} target='_blank' rel='noopener noreferrer'>
          {t('managedKeys')}
        </ChipLink>
      </div>
    </SettingsPanel>
  )
}
