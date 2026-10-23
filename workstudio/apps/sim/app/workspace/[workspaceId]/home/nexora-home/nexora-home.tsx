'use client'

import { useState } from 'react'
import { Chip, ChipLink, toast } from '@sim/emcn'
import { HelpCircle } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useSession } from '@/lib/auth/client'
import { docsUrl } from '@/lib/branding/docs-url'
import { CreateCards } from '@/app/workspace/[workspaceId]/home/nexora-home/create-cards'
import { OnboardingPanel } from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-panel'
import { shouldOfferResume } from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-state'
import { PlatformStatus } from '@/app/workspace/[workspaceId]/home/nexora-home/platform-status'
import { QuickStarts } from '@/app/workspace/[workspaceId]/home/nexora-home/quick-starts'
import { useNexoraHome, useUpdateNexoraOnboarding } from '@/hooks/queries/nexora-home'

interface NexoraHomeProps {
  workspaceId: string
}

/** Nexora edition: the workspace home page — create, quick starts, platform status, first launch. */
export function NexoraHome({ workspaceId }: NexoraHomeProps) {
  const t = useTranslations('home.nexoraHome')
  const { data: session } = useSession()
  const { data: home, isError: isHomeError } = useNexoraHome()
  const updateOnboarding = useUpdateNexoraOnboarding()
  const [isFirstResultShown, setIsFirstResultShown] = useState(false)

  const firstName = session?.user?.name?.trim().split(/\s+/)[0]
  const onboarding = home?.isInstanceAdmin ? home.onboarding : null
  const showOnboarding = onboarding !== null && (!onboarding.dismissed || isFirstResultShown)

  const handleResume = () => {
    updateOnboarding.mutate(
      { dismissed: false },
      { onError: () => toast.error(t('onboarding.saveFailed')) }
    )
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-7 py-10'>
        <header className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 flex-col gap-1'>
            <h1 className='font-medium text-[var(--text-body)] text-lg'>
              {firstName ? t('greeting', { name: firstName }) : t('greetingWithoutName')}
            </h1>
            <p className='text-[var(--text-muted)] text-small'>{t('subtitle')}</p>
          </div>
          <div className='flex shrink-0 items-center gap-1'>
            {shouldOfferResume(onboarding) && !isFirstResultShown && (
              <Chip disabled={updateOnboarding.isPending} onClick={handleResume}>
                {t('onboarding.resume')}
              </Chip>
            )}
            <ChipLink
              href={docsUrl('/getting-started')}
              target='_blank'
              rel='noopener noreferrer'
              leftIcon={HelpCircle}
            >
              {t('help')}
            </ChipLink>
          </div>
        </header>
        {showOnboarding && (
          <OnboardingPanel
            workspaceId={workspaceId}
            completed={onboarding.completed}
            dismissed={onboarding.dismissed}
            defaultModel={home?.defaultModel ?? null}
            organizationId={home?.organizationId ?? null}
            emailConfigured={home?.emailConfigured ?? false}
            onFirstRunCompleted={() => setIsFirstResultShown(true)}
            onClose={() => setIsFirstResultShown(false)}
          />
        )}
        <CreateCards workspaceId={workspaceId} />
        <QuickStarts workspaceId={workspaceId} />
        <PlatformStatus
          workspaceId={workspaceId}
          defaultModel={home ? home.defaultModel : undefined}
          isHomeError={isHomeError}
          isInstanceAdmin={home?.isInstanceAdmin ?? false}
        />
      </div>
    </div>
  )
}
