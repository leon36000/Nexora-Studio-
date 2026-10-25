'use client'

import { useRef, useState } from 'react'
import {
  Chip,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalFooter,
  ChipModalHeader,
} from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { AssistantTask } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  getTaskErrorCode,
  useCreateAssistantTask,
  usePlanAssistantTask,
} from '@/hooks/queries/nexora-assistant-extended'

interface ScheduleProposalProps {
  workspaceId: string
  /** What the member typed: « tous les matins à 8 h, résume mes e-mails ». */
  request: string
  onSendToAgent: () => void
  onCreated: (task: AssistantTask, request: string) => void
}

/**
 * Shown instead of sending a message that reads as an instruction to repeat: the member chooses to
 * schedule it as a task (the Copilot plans it, they review it, then it is created and deployed) or
 * to send it to the agent as it is.
 */
export function ScheduleProposal({
  workspaceId,
  request,
  onSendToAgent,
  onCreated,
}: ScheduleProposalProps) {
  const t = useTranslations('assistant.tasks')
  const tErrors = useTranslations('assistant.tasks.errors')
  const plan = usePlanAssistantTask()
  const create = useCreateAssistantTask()
  const controllerRef = useRef<AbortController | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const start = () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setReviewing(true)
    plan.mutate({ workspaceId, request, signal: controller.signal })
  }

  const close = () => {
    if (create.isPending) return
    controllerRef.current?.abort()
    plan.reset()
    create.reset()
    setReviewing(false)
  }

  const submit = () => {
    if (!plan.data || create.isPending) return
    create.mutate(
      { workspaceId, request, plan: plan.data.plan },
      {
        onSuccess: ({ task }) => {
          plan.reset()
          setReviewing(false)
          onCreated(task, request)
        },
      }
    )
  }

  const errorCode = plan.isError
    ? (getTaskErrorCode(plan.error) ?? 'unknown')
    : create.isError
      ? (getTaskErrorCode(create.error) ?? 'unknown')
      : null

  return (
    <>
      <div
        role='group'
        aria-label={t('propose')}
        className='flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2'
      >
        <span className='mr-auto text-[var(--text-body)] text-small'>{t('propose')}</span>
        <Chip variant='primary' onClick={start}>
          {t('schedule')}
        </Chip>
        <Chip onClick={onSendToAgent}>{t('sendToAgent')}</Chip>
      </div>
      <ChipModal
        open={reviewing}
        onOpenChange={(open) => !open && close()}
        srTitle={t('planTitle')}
        size='md'
      >
        <ChipModalHeader onClose={close}>{t('planTitle')}</ChipModalHeader>
        <ChipModalBody>
          <p className='whitespace-pre-wrap px-2 text-[var(--text-muted)] text-small'>{request}</p>
          {plan.isPending && (
            <div className='flex items-center gap-2 px-2 text-[var(--text-muted)] text-small'>
              <Loader className='size-[14px]' animate />
              {t('planning')}
            </div>
          )}
          {plan.data && (
            <div className='flex flex-col gap-3 px-2'>
              <p className='text-[var(--text-body)] text-sm'>{plan.data.schedule}</p>
              <ol className='flex list-decimal flex-col gap-1 pl-5 text-[var(--text-body)] text-small'>
                {plan.data.summary.slice(1).map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ol>
              {plan.data.warnings.length > 0 && (
                <div className='flex flex-col gap-1'>
                  <span className='text-[var(--text-muted)] text-caption'>{t('warnings')}</span>
                  <ul className='flex list-disc flex-col gap-1 pl-5 text-[var(--text-body)] text-caption'>
                    {plan.data.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <ChipModalError>{errorCode ? tErrors(errorCode) : null}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          cancelLabel={t('cancel')}
          onCancel={close}
          cancelDisabled={create.isPending}
          primaryAction={{
            label: create.isPending ? t('creating') : t('create'),
            onClick: submit,
            disabled: !plan.data || create.isPending,
          }}
        />
      </ChipModal>
    </>
  )
}
