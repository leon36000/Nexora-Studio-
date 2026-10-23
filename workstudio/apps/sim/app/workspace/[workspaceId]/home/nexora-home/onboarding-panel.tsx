'use client'

import type { ReactNode } from 'react'
import { Chip, ChipLink, cn, toast } from '@sim/emcn'
import { Circle, CircleCheck } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/nexora/onboarding-steps'
import {
  FirstRunStepAction,
  OrganizationStepAction,
  TeamStepAction,
} from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-step-actions'
import { useUpdateNexoraOnboarding } from '@/hooks/queries/nexora-home'

interface OnboardingPanelProps {
  workspaceId: string
  completed: OnboardingStep[]
  /** The panel was hidden; it stays on screen only to show the first result just produced. */
  dismissed: boolean
  defaultModel: string | null
  /** The first result was produced: keep the panel up so its text stays readable. */
  onFirstRunCompleted: () => void
  /** Closes the panel once the first launch is over. */
  onClose: () => void
}

interface StepRowProps {
  title: string
  done: boolean
  onMarkDone?: () => void
  markDoneDisabled: boolean
  children?: ReactNode
}

function StepRow({ title, done, onMarkDone, markDoneDisabled, children }: StepRowProps) {
  const t = useTranslations('home.nexoraHome.onboarding')
  const Icon = done ? CircleCheck : Circle
  return (
    <li className='flex gap-3 py-3'>
      <Icon
        className={cn(
          'mt-px size-[16px] shrink-0',
          done ? 'text-[var(--brand-blue)]' : 'text-[var(--text-icon)]'
        )}
      />
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <div className='flex items-center justify-between gap-3'>
          <span className='text-[var(--text-body)] text-sm'>{title}</span>
          {!done && onMarkDone && (
            <Chip disabled={markDoneDisabled} onClick={onMarkDone}>
              {t('markDone')}
            </Chip>
          )}
        </div>
        {children}
      </div>
    </li>
  )
}

/**
 * « Premier lancement »: the five first-launch steps an instance admin walks through once per
 * organization. Each step can be marked done by hand; the first result ends the first launch.
 */
export function OnboardingPanel({
  workspaceId,
  completed,
  dismissed,
  defaultModel,
  onFirstRunCompleted,
  onClose,
}: OnboardingPanelProps) {
  const t = useTranslations('home.nexoraHome.onboarding')
  const updateOnboarding = useUpdateNexoraOnboarding()
  const done = new Set(completed)

  const complete = (step: OnboardingStep) => {
    if (step === 'first-run') onFirstRunCompleted()
    updateOnboarding.mutate({ complete: step }, { onError: () => toast.error(t('saveFailed')) })
  }

  const handleLater = () => {
    updateOnboarding.mutate({ dismissed: true }, { onError: () => toast.error(t('saveFailed')) })
  }

  const stepAction: Record<OnboardingStep, ReactNode> = {
    organization: <OrganizationStepAction onDone={() => complete('organization')} />,
    model: (
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[var(--text-muted)] text-small'>
          {t('steps.model.current', { name: defaultModel ?? '—' })}
        </span>
        <ChipLink variant='border' href={`/workspace/${workspaceId}/settings/models`}>
          {t('steps.model.manage')}
        </ChipLink>
      </div>
    ),
    team: <TeamStepAction workspaceId={workspaceId} />,
    tools: (
      <div>
        <ChipLink variant='border' href={`/workspace/${workspaceId}/settings/mcp`}>
          {t('steps.tools.open')}
        </ChipLink>
      </div>
    ),
    'first-run': (
      <FirstRunStepAction workspaceId={workspaceId} onDone={() => complete('first-run')} />
    ),
  }

  return (
    <section className='flex flex-col rounded-lg border border-[var(--border)] px-4 pt-3 pb-1'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-baseline gap-2'>
          <h2 className='font-medium text-[var(--text-body)] text-sm'>{t('title')}</h2>
          <span className='text-[var(--text-muted)] text-caption'>
            {t('progress', { done: done.size, total: ONBOARDING_STEPS.length })}
          </span>
        </div>
        {dismissed ? (
          <Chip onClick={onClose}>{t('close')}</Chip>
        ) : (
          <Chip disabled={updateOnboarding.isPending} onClick={handleLater}>
            {t('later')}
          </Chip>
        )}
      </div>
      <ol className='flex flex-col divide-y divide-[var(--border)]'>
        {ONBOARDING_STEPS.map((step) => (
          <StepRow
            key={step}
            title={t(`steps.${step}.title`)}
            done={done.has(step)}
            markDoneDisabled={updateOnboarding.isPending}
            onMarkDone={() => complete(step)}
          >
            {stepAction[step]}
          </StepRow>
        ))}
      </ol>
    </section>
  )
}
