'use client'

import { useState } from 'react'
import {
  Badge,
  Chip,
  ChipConfirmModal,
  ChipLink,
  ChipModal,
  ChipModalBody,
  ChipModalFooter,
  ChipModalHeader,
  Skeleton,
  Switch,
} from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import type { AssistantTask } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  useAssistantTaskRuns,
  useAssistantTasks,
  useDeleteAssistantTask,
  useSetAssistantTaskEnabled,
} from '@/hooks/queries/nexora-assistant-extended'

interface TasksModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Writers can open the task's workflow in the editor. */
  canOpenEditor: boolean
}

/** The member's scheduled tasks: when each runs, switch it off or on, its last results, delete it. */
export function TasksModal({ workspaceId, open, onOpenChange, canOpenEditor }: TasksModalProps) {
  const t = useTranslations('assistant.tasks')
  const tasks = useAssistantTasks(workspaceId, open)
  const [deleting, setDeleting] = useState<AssistantTask | null>(null)
  const remove = useDeleteAssistantTask()

  return (
    <>
      <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')} size='lg'>
        <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
        <ChipModalBody>
          {tasks.isPending ? (
            <Skeleton className='h-[72px] w-full rounded-lg' />
          ) : tasks.isError ? (
            <p className='px-2 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
          ) : tasks.data.length === 0 ? (
            <p className='px-2 text-[var(--text-muted)] text-small'>{t('empty')}</p>
          ) : (
            <ul className='flex flex-col gap-2 px-2'>
              {tasks.data.map((task) => (
                <TaskRow
                  key={task.id}
                  workspaceId={workspaceId}
                  task={task}
                  canOpenEditor={canOpenEditor}
                  onDelete={() => setDeleting(task)}
                />
              ))}
            </ul>
          )}
        </ChipModalBody>
        <ChipModalFooter hideCancel defaultAction='none' />
      </ChipModal>
      <ChipConfirmModal
        open={deleting !== null}
        onOpenChange={(next) => !next && !remove.isPending && setDeleting(null)}
        title={t('deleteTitle')}
        text={
          remove.isError
            ? [{ text: t('deleteFailed'), error: true }]
            : t('deleteText', { title: deleting?.title ?? '' })
        }
        dismissLabel={t('cancel')}
        confirm={{
          label: t('delete'),
          pending: remove.isPending,
          disabled: remove.isPending,
          onClick: () => {
            if (!deleting) return
            remove.mutate(deleting.id, {
              onSuccess: () => {
                remove.reset()
                setDeleting(null)
              },
            })
          },
        }}
      />
    </>
  )
}

interface TaskRowProps {
  workspaceId: string
  task: AssistantTask
  canOpenEditor: boolean
  onDelete: () => void
}

function TaskRow({ workspaceId, task, canOpenEditor, onDelete }: TaskRowProps) {
  const t = useTranslations('assistant.tasks')
  const format = useFormatter()
  const [showRuns, setShowRuns] = useState(false)
  const setEnabled = useSetAssistantTaskEnabled()
  const { schedule } = task
  const active = schedule?.status === 'active'

  return (
    <li className='flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <span className='break-words text-[var(--text-body)] text-small'>{task.title}</span>
          <span className='text-[var(--text-muted)] text-caption'>
            {schedule ? schedule.label : t('noSchedule')}
          </span>
          {schedule?.nextRunAt && active && (
            <span className='text-[var(--text-muted)] text-caption'>
              {t('next', {
                date: format.dateTime(new Date(schedule.nextRunAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              })}
            </span>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          {schedule && !active && (
            <Badge variant='gray' size='sm'>
              {t('off')}
            </Badge>
          )}
          {schedule && (
            <Switch
              checked={active}
              disabled={setEnabled.isPending}
              aria-label={t('toggle', { title: task.title })}
              onCheckedChange={(enabled) => setEnabled.mutate({ taskId: task.id, enabled })}
            />
          )}
        </div>
      </div>
      {setEnabled.isError && (
        <p role='alert' className='text-[var(--text-error)] text-caption'>
          {t('toggleFailed')}
        </p>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        <Chip aria-expanded={showRuns} onClick={() => setShowRuns((shown) => !shown)}>
          {showRuns ? t('hideRuns') : t('showRuns')}
        </Chip>
        {canOpenEditor && (
          <ChipLink href={`/workspace/${workspaceId}/w/${task.workflowId}`}>
            {t('openEditor')}
          </ChipLink>
        )}
        <Chip variant='destructive' onClick={onDelete}>
          {t('delete')}
        </Chip>
      </div>
      {showRuns && <TaskRuns taskId={task.id} />}
    </li>
  )
}

function TaskRuns({ taskId }: { taskId: string }) {
  const t = useTranslations('assistant.tasks')
  const tStatus = useTranslations('assistant.tasks.runStatus')
  const format = useFormatter()
  const runs = useAssistantTaskRuns(taskId)

  if (runs.isPending) return <Skeleton className='h-[40px] w-full rounded-lg' />
  if (runs.isError) {
    return <p className='text-[var(--text-error)] text-caption'>{t('runsFailed')}</p>
  }
  if (runs.data.length === 0) {
    return <p className='text-[var(--text-muted)] text-caption'>{t('noRuns')}</p>
  }
  return (
    <ul className='flex flex-col divide-y divide-[var(--border)]'>
      {runs.data.map((run) => (
        <li key={run.executionId} className='flex flex-col gap-1 py-2'>
          <div className='flex items-center justify-between gap-2 text-caption'>
            <span className='text-[var(--text-muted)]'>
              {format.dateTime(new Date(run.startedAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <span className='text-[var(--text-body)]'>
              {tStatus.has(run.status) ? tStatus(run.status) : run.status}
            </span>
          </div>
          {run.output && (
            <p className='line-clamp-6 whitespace-pre-wrap text-[var(--text-body)] text-small'>
              {run.output}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
