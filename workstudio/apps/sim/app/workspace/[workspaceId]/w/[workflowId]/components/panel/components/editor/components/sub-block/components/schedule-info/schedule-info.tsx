import { Badge } from '@sim/emcn'
import { useLocale, useTranslations } from 'next-intl'
import { parseCronToHumanReadable } from '@/lib/workflows/schedules/utils'
import { useWorkflowScope } from '@/app/workspace/[workspaceId]/providers/workflow-scope-provider'
import { useRedeployWorkflowSchedule, useScheduleQuery } from '@/hooks/queries/schedules'
import { useSubBlockStore } from '@/stores/workflows/subblock/store'
import { MAX_CONSECUTIVE_FAILURES } from '@/triggers/constants'

interface ScheduleInfoProps {
  blockId: string
  isPreview?: boolean
}

/**
 * Schedule status display component.
 * Shows the current schedule status, next run time, and last run time.
 * Schedule creation/deletion is handled during workflow deploy/undeploy.
 */
export function ScheduleInfo({ blockId, isPreview = false }: ScheduleInfoProps) {
  const t = useTranslations('editor.subBlock.scheduleInfo')
  const locale = useLocale()
  const { workflowId } = useWorkflowScope()

  const scheduleTimezone = useSubBlockStore((state) => state.getValue(blockId, 'timezone')) as
    | string
    | undefined

  const { data: schedule, isLoading } = useScheduleQuery(workflowId ?? undefined, blockId, {
    enabled: !isPreview,
  })

  const redeployMutation = useRedeployWorkflowSchedule()

  const handleRedeploy = () => {
    if (isPreview || !workflowId || redeployMutation.isPending) return
    redeployMutation.mutate({ workflowId, blockId })
  }

  if (!schedule || isLoading) {
    return null
  }

  const timezone = scheduleTimezone || schedule?.timezone || 'UTC'
  const failedCount = schedule?.failedCount || 0
  const isDisabled = schedule?.status === 'disabled'
  const nextRunAt = schedule?.nextRunAt ? new Date(schedule.nextRunAt) : null

  return (
    <div className='space-y-1.5'>
      {/* Status badges */}
      {(failedCount > 0 || isDisabled) && (
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            {failedCount >= MAX_CONSECUTIVE_FAILURES && isDisabled ? (
              <Badge
                variant='outline'
                className='cursor-pointer'
                style={{
                  borderColor: 'var(--warning)',
                  color: 'var(--warning)',
                }}
                onClick={handleRedeploy}
              >
                {redeployMutation.isPending ? t('redeploying') : t('disabled')}
              </Badge>
            ) : failedCount > 0 ? (
              <Badge
                variant='outline'
                style={{
                  borderColor: 'var(--warning)',
                  color: 'var(--warning)',
                }}
              >
                {t('failedCount', { count: failedCount })}
              </Badge>
            ) : null}
          </div>
          {failedCount >= MAX_CONSECUTIVE_FAILURES && isDisabled && (
            <p className='text-[var(--text-tertiary)] text-caption'>
              {t('disabledAfterFailures', { count: MAX_CONSECUTIVE_FAILURES })}
            </p>
          )}
          {redeployMutation.isError && (
            <p className='text-[var(--text-error)] text-caption'>{t('redeployFailed')}</p>
          )}
        </div>
      )}

      {/* Schedule info - only show when active */}
      {!isDisabled && (
        <div className='text-[var(--text-tertiary)] text-caption'>
          {schedule?.cronExpression && (
            <span>{parseCronToHumanReadable(schedule.cronExpression, timezone)}</span>
          )}
          {nextRunAt && (
            <>
              {schedule?.cronExpression && <span className='mx-1'>·</span>}
              <span>
                {t('next')}{' '}
                {nextRunAt.toLocaleString(locale, {
                  timeZone: timezone,
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: locale.startsWith('en'),
                })}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
