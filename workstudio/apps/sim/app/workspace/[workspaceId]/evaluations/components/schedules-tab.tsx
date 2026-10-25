'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, OverflowText, toast } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import type { NexoraEvalSchedule } from '@/lib/api/contracts/nexora-evaluations'
import { ListState, RowList } from '@/app/workspace/[workspaceId]/evaluations/components/list-state'
import { ScheduleModal } from '@/app/workspace/[workspaceId]/evaluations/components/schedule-modal'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import {
  useDeleteEvalSchedule,
  useEvalSchedules,
  useRunEvalSchedule,
} from '@/hooks/queries/nexora-evaluations'

interface SchedulesTabProps {
  workspaceId: string
}

/** Campaigns that run on their own, by night for instance, and alert when a target falls under its threshold. */
export function SchedulesTab({ workspaceId }: SchedulesTabProps) {
  const t = useTranslations('evaluations')
  const format = useFormatter()
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data: schedules, isLoading, isError } = useEvalSchedules(workspaceId)
  const { mutateAsync: runSchedule, isPending: isRunning } = useRunEvalSchedule()
  const { mutateAsync: deleteSchedule, isPending: isDeleting } = useDeleteEvalSchedule()
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<NexoraEvalSchedule | null>(null)

  const handleRun = async (schedule: NexoraEvalSchedule) => {
    try {
      const { campaign } = await runSchedule({ workspaceId, scheduleId: schedule.id })
      router.push(`/workspace/${workspaceId}/evaluations/campaigns/${campaign.id}`)
    } catch (error) {
      toast.error(getErrorMessage(error, t('schedules.runFailed')))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteSchedule({ workspaceId, scheduleId: pendingDelete.id })
      setPendingDelete(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('schedules.deleteFailed')))
    }
  }

  const dateTime = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className='flex flex-col gap-4'>
      {canEdit && (
        <Chip
          variant='primary'
          leftIcon={Plus}
          className='self-start'
          onClick={() => setIsCreating(true)}
        >
          {t('schedules.new')}
        </Chip>
      )}
      <ListState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!schedules?.length}
        errorMessage={t('schedules.loadFailed')}
        emptyMessage={t('schedules.empty')}
      >
        <RowList>
          {schedules?.map((schedule) => (
            <li key={schedule.id} className='flex items-center gap-3 px-4 py-3'>
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <OverflowText label={schedule.name} className='text-[var(--text-body)] text-sm' />
                <span className='text-[var(--text-muted)] text-caption'>
                  {t('schedules.timetable', { cron: schedule.cron, timezone: schedule.timezone })}
                  {schedule.alertThreshold !== null
                    ? ` · ${t('schedules.threshold', { value: Math.round(schedule.alertThreshold * 100) })}`
                    : ''}
                </span>
              </div>
              <div className='flex shrink-0 flex-col items-end gap-0.5 text-[var(--text-muted)] text-caption'>
                <span>{t('schedules.next', { date: dateTime(schedule.nextRunAt) })}</span>
                <span>{t('schedules.last', { date: dateTime(schedule.lastRunAt) })}</span>
              </div>
              {canEdit && (
                <div className='flex shrink-0 items-center gap-1'>
                  <Chip disabled={isRunning} onClick={() => void handleRun(schedule)}>
                    {t('schedules.run')}
                  </Chip>
                  <Chip disabled={isDeleting} onClick={() => setPendingDelete(schedule)}>
                    {t('schedules.delete')}
                  </Chip>
                </div>
              )}
            </li>
          ))}
        </RowList>
      </ListState>
      <ScheduleModal workspaceId={workspaceId} open={isCreating} onOpenChange={setIsCreating} />
      <ChipConfirmModal
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null)
        }}
        title={t('schedules.deleteTitle', { name: pendingDelete?.name ?? '' })}
        text={t('schedules.deleteText')}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('schedules.delete'),
          variant: 'destructive',
          pending: isDeleting,
          disabled: isDeleting,
          onClick: () => void handleDelete(),
        }}
      />
    </div>
  )
}
