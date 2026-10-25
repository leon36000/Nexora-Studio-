'use client'

import { useState } from 'react'
import { Badge, Chip, ChipInput } from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import type { AssistantCard } from '@/lib/api/contracts/nexora-assistant'

/** Loaded on demand: keeps the Markdown renderer out of the page's first bundle. */
const MarkdownRenderer = dynamic(
  () => import('@/app/(interfaces)/chat/components/message/components/markdown-renderer')
)

type WorkflowRunPayload = Extract<AssistantCard, { kind: 'workflow_run' }>['payload']
type TaskPayload = Extract<AssistantCard, { kind: 'task' }>['payload']

/** What the person answered on a run waiting for a validation. */
export interface RunAnswer {
  approved: boolean
  comment: string
}

interface WorkflowRunCardProps {
  payload: WorkflowRunPayload
  /** Only members who can write may answer: the resume API asks for it. */
  canAnswer: boolean
  /** The answer is being sent. */
  isAnswering: boolean
  answerFailed: boolean
  onAnswer: (answer: RunAnswer) => void
}

/** A workflow launched from the Assistant: its form, its result, and the validation it may wait for. */
export function WorkflowRunCard({
  payload,
  canAnswer,
  isAnswering,
  answerFailed,
  onAnswer,
}: WorkflowRunCardProps) {
  const t = useTranslations('assistant.card.workflow')
  const [comment, setComment] = useState('')
  const inputs = Object.entries(payload.inputs ?? {})
  const pause = payload.status === 'paused' ? payload.pause : null

  return (
    <section className='flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3'>
      <header className='flex items-center justify-between gap-2'>
        <h3 className='text-[var(--text-body)] text-small'>{t('title', { name: payload.name })}</h3>
        {payload.status === 'completed' && (
          <Badge variant='green' size='sm'>
            {payload.resolution === 'refused' ? t('refused') : t('completed')}
          </Badge>
        )}
        {payload.status === 'failed' && (
          <Badge variant='red' size='sm'>
            {t('failedBadge')}
          </Badge>
        )}
        {payload.status === 'paused' && (
          <Badge variant='gray' size='sm'>
            {t('awaiting')}
          </Badge>
        )}
      </header>
      {inputs.length > 0 && (
        <dl className='flex flex-col gap-1 text-caption'>
          {inputs.map(([name, value]) => (
            <div key={name} className='flex gap-2'>
              <dt className='shrink-0 text-[var(--text-muted)]'>{name}</dt>
              <dd className='min-w-0 break-words text-[var(--text-body)]'>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {payload.status === 'failed' && (
        <p className='text-[var(--text-error)] text-small'>{payload.error ?? t('failed')}</p>
      )}
      {payload.status === 'completed' &&
        (payload.output ? (
          <div className='min-w-0 break-words text-[var(--text-body)] text-sm'>
            <MarkdownRenderer content={payload.output} sameOriginImages />
          </div>
        ) : (
          <p className='text-[var(--text-muted)] text-small'>{t('noResult')}</p>
        ))}
      {pause && (
        <div className='flex flex-col gap-2'>
          {pause.message && (
            <p className='whitespace-pre-wrap text-[var(--text-body)] text-small'>
              {pause.message}
            </p>
          )}
          {canAnswer ? (
            <>
              <ChipInput
                aria-label={t('comment')}
                placeholder={t('comment')}
                value={comment}
                disabled={isAnswering}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className='flex items-center gap-2'>
                <Chip
                  variant='primary'
                  disabled={isAnswering}
                  onClick={() => onAnswer({ approved: true, comment })}
                >
                  {t('approve')}
                </Chip>
                <Chip disabled={isAnswering} onClick={() => onAnswer({ approved: false, comment })}>
                  {t('refuse')}
                </Chip>
                {isAnswering && <Loader className='size-[14px] text-[var(--text-muted)]' animate />}
              </div>
              {answerFailed && (
                <p role='alert' className='text-[var(--text-error)] text-caption'>
                  {t('answerFailed')}
                </p>
              )}
            </>
          ) : (
            <p className='text-[var(--text-muted)] text-small'>{t('readerWaits')}</p>
          )}
        </div>
      )}
    </section>
  )
}

interface TaskCardProps {
  payload: TaskPayload
  onOpenTasks: () => void
}

/** A scheduled task just created from the conversation. */
export function TaskCard({ payload, onOpenTasks }: TaskCardProps) {
  const t = useTranslations('assistant.card.task')
  return (
    <section className='flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3'>
      <h3 className='text-[var(--text-body)] text-small'>{t('title', { title: payload.title })}</h3>
      <p className='text-[var(--text-body)] text-small'>{payload.schedule}</p>
      <Chip className='self-start' onClick={onOpenTasks}>
        {t('manage')}
      </Chip>
    </section>
  )
}
