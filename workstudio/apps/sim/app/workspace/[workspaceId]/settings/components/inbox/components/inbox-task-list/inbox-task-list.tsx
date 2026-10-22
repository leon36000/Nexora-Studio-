'use client'

import { useCallback, useMemo } from 'react'
import { Badge, ChipInput, ChipSelect, Search } from '@sim/emcn'
import { ArrowRight, Paperclip } from '@sim/emcn/icons'
import { formatRelativeTime } from '@sim/utils/formatting'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import {
  INBOX_STATUS_FILTERS,
  type InboxStatusFilter,
  inboxTaskParsers,
  inboxTaskUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/inbox/search-params'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { RESOURCE_ROW_ARROW_CLASSES } from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import type { InboxTaskItem } from '@/hooks/queries/inbox'
import { useInboxConfig, useInboxTasks } from '@/hooks/queries/inbox'
import { useDebouncedSearchSetter } from '@/hooks/use-debounced-search-setter'

type StatusFilter = InboxStatusFilter

const STATUS_BADGE_VARIANTS = {
  received: 'gray',
  processing: 'amber',
  completed: 'green',
  failed: 'red',
  rejected: 'gray-secondary',
} as const

type BadgeStatus = keyof typeof STATUS_BADGE_VARIANTS

const KNOWN_REJECTION_REASONS = new Set([
  'sender_not_allowed',
  'automated_sender',
  'rate_limit_exceeded',
  'not_entitled',
])

export function InboxTaskList() {
  const t = useTranslations('settings.inbox.taskList')
  const statusOptions = INBOX_STATUS_FILTERS.map((value) => ({
    value,
    label: t(`statusFilters.${value}`),
  }))
  const formatRejectionReason = (reason: string) =>
    KNOWN_REJECTION_REASONS.has(reason) ? t(`rejectionReasons.${reason}`) : reason
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  const [{ status: statusFilter, search: searchTerm }, setInboxFilters] = useQueryStates(
    inboxTaskParsers,
    inboxTaskUrlKeys
  )

  /**
   * The input is controlled directly by the instant nuqs value; only the URL
   * write is debounced. Filtering below is cheap in-memory over the loaded
   * tasks, so it reads the instant value too.
   */
  const setSearchTerm = useDebouncedSearchSetter((value, options) =>
    setInboxFilters({ search: value }, options)
  )

  const { data: config } = useInboxConfig(workspaceId)
  const { data: tasksData, isLoading } = useInboxTasks(workspaceId, {
    status: statusFilter,
  })

  const filteredTasks = useMemo(() => {
    if (!tasksData?.tasks) return []
    if (!searchTerm.trim()) return tasksData.tasks
    const term = searchTerm.trim().toLowerCase()
    return tasksData.tasks.filter(
      (task) =>
        task.subject?.toLowerCase().includes(term) ||
        task.fromEmail?.toLowerCase().includes(term) ||
        task.bodyPreview?.toLowerCase().includes(term)
    )
  }, [tasksData?.tasks, searchTerm])

  const handleTaskClick = useCallback(
    (task: InboxTaskItem) => {
      if (task.chatId && (task.status === 'completed' || task.status === 'failed')) {
        router.push(`/workspace/${workspaceId}/chat/${task.chatId}`)
      }
    },
    [workspaceId, router]
  )

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <ChipInput
          icon={Search}
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='min-w-0 flex-1'
        />
        <ChipSelect
          align='start'
          value={statusFilter}
          onChange={(value) => {
            if (statusOptions.some((option) => option.value === value)) {
              setInboxFilters({ status: value as StatusFilter })
            }
          }}
          options={statusOptions.map((opt) => ({ label: opt.label, value: opt.value }))}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {isLoading ? null : filteredTasks.length === 0 ? (
          searchTerm.trim() ? (
            <SettingsEmptyState variant='inline'>
              {t('noMatches', { query: searchTerm })}
            </SettingsEmptyState>
          ) : (
            <SettingsEmptyState>
              {config?.address ? t('emptyWithAddress', { address: config.address }) : t('empty')}
            </SettingsEmptyState>
          )
        ) : (
          <div className='-mx-2 flex flex-col gap-y-0.5'>
            {filteredTasks.map((task) => {
              const badgeStatus: BadgeStatus = Object.hasOwn(STATUS_BADGE_VARIANTS, task.status)
                ? (task.status as BadgeStatus)
                : 'received'
              const statusBadge = {
                variant: STATUS_BADGE_VARIANTS[badgeStatus],
                label: t(`statusBadges.${badgeStatus}`),
              }
              const isClickable =
                task.chatId && (task.status === 'completed' || task.status === 'failed')
              const rowClassName = `flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors ${
                isClickable
                  ? 'cursor-pointer hover-hover:bg-[var(--surface-active)]'
                  : 'cursor-default'
              }`
              const rowContent = (
                <>
                  <div className='flex min-w-0 flex-1 flex-col'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='truncate text-[var(--text-body)] text-sm'>
                        {task.subject}
                      </span>
                      {task.hasAttachments && (
                        <Paperclip className='size-[12px] shrink-0 text-[var(--text-muted)]' />
                      )}
                    </div>
                    <span className='truncate text-[var(--text-muted)] text-caption'>
                      {task.fromName || task.fromEmail}
                    </span>
                    {task.status === 'rejected' && task.rejectionReason && (
                      <span className='truncate text-[var(--text-muted)] text-caption line-through'>
                        {formatRejectionReason(task.rejectionReason)}
                      </span>
                    )}
                    {task.status === 'failed' && task.errorMessage && (
                      <span className='truncate text-[var(--text-error)] text-caption'>
                        {task.errorMessage}
                      </span>
                    )}
                    {task.status === 'completed' && task.resultSummary && (
                      <span className='truncate text-[var(--text-muted)] text-caption'>
                        {task.resultSummary}
                      </span>
                    )}
                    {task.status !== 'completed' &&
                      task.status !== 'failed' &&
                      task.status !== 'rejected' &&
                      task.bodyPreview && (
                        <span className='truncate text-[var(--text-muted)] text-caption'>
                          {task.bodyPreview}
                        </span>
                      )}
                  </div>
                  <div className='flex shrink-0 items-center gap-2'>
                    <span className='whitespace-nowrap text-[var(--text-muted)] text-caption'>
                      {formatRelativeTime(task.createdAt)}
                    </span>
                    <Badge variant={statusBadge.variant} size='sm'>
                      {task.status === 'processing' && (
                        <span className='mr-1 inline-block size-[6px] animate-pulse rounded-full bg-[var(--badge-amber-text)]' />
                      )}
                      {statusBadge.label}
                    </Badge>
                    {isClickable && <ArrowRight className={RESOURCE_ROW_ARROW_CLASSES} />}
                  </div>
                </>
              )

              return isClickable ? (
                <button
                  key={task.id}
                  type='button'
                  className={rowClassName}
                  onClick={() => handleTaskClick(task)}
                >
                  {rowContent}
                </button>
              ) : (
                <div key={task.id} className={rowClassName}>
                  {rowContent}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
