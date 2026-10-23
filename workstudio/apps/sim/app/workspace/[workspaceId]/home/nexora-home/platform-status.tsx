'use client'

import type { ReactNode } from 'react'
import { Badge, OverflowText, Skeleton } from '@sim/emcn'
import Link from 'next/link'
import { useFormatter, useNow, useTranslations } from 'next-intl'
import { HomeSection } from '@/app/workspace/[workspaceId]/home/nexora-home/home-section'
import {
  type RunStatus,
  toRunStatus,
} from '@/app/workspace/[workspaceId]/home/nexora-home/run-status'
import { type LogFilters, useLogsList } from '@/hooks/queries/logs'
import { useNexoraUsage } from '@/hooks/queries/nexora-usage'

const USAGE_DAYS = 30
const RELATIVE_TIME_REFRESH_MS = 60 * 1000

const RECENT_RUN_FILTERS: LogFilters = {
  timeRange: 'All time',
  level: 'all',
  workflowIds: [],
  folderIds: [],
  triggers: [],
  searchQuery: '',
  limit: 5,
  sortBy: 'date',
  sortOrder: 'desc',
}

const RUN_STATUS_VARIANT = {
  success: 'green',
  error: 'red',
  running: 'amber',
  paused: 'blue',
  cancelled: 'gray',
  unknown: 'gray',
} as const satisfies Record<RunStatus, string>

interface StatusRowProps {
  label: string
  children: ReactNode
}

function StatusRow({ label, children }: StatusRowProps) {
  return (
    <div className='flex items-center justify-between gap-4 px-0.5'>
      <dt className='text-[var(--text-muted)] text-small'>{label}</dt>
      <dd className='text-right text-[var(--text-body)] text-small'>{children}</dd>
    </div>
  )
}

/** Consumption over the last 30 days, from Nexora API (instance admins only). */
function UsageValue() {
  const t = useTranslations('home.nexoraHome.status')
  const { data, isLoading } = useNexoraUsage(USAGE_DAYS)
  if (isLoading) return <Skeleton className='h-[14px] w-[120px]' />
  if (!data) return t('unavailable')
  return t('usageValue', { requests: data.totals.requests, tokens: data.totals.totalTokens })
}

interface PlatformStatusProps {
  workspaceId: string
  /** `undefined` while the home status loads; `null` when Nexora API does not answer. */
  defaultModel: string | null | undefined
  /** The home status could not be loaded: show the default model as unavailable. */
  isHomeError: boolean
  isInstanceAdmin: boolean
}

/** « État de la plateforme »: default model, the admins' consumption, the last runs. */
export function PlatformStatus({
  workspaceId,
  defaultModel,
  isHomeError,
  isInstanceAdmin,
}: PlatformStatusProps) {
  const t = useTranslations('home.nexoraHome.status')
  const format = useFormatter()
  const now = useNow({ updateInterval: RELATIVE_TIME_REFRESH_MS })
  const {
    data: runPages,
    isPending: runsPending,
    isPlaceholderData: runsFromOtherWorkspace,
    isError: runsError,
  } = useLogsList(workspaceId, RECENT_RUN_FILTERS)
  const runs = runPages?.pages[0]?.logs ?? []

  return (
    <HomeSection title={t('label')}>
      <div className='flex flex-col gap-5'>
        <dl className='flex flex-col gap-2'>
          <StatusRow label={t('defaultModel')}>
            {defaultModel === undefined && !isHomeError ? (
              <Skeleton className='h-[14px] w-[120px]' />
            ) : (
              (defaultModel ?? t('unavailable'))
            )}
          </StatusRow>
          {isInstanceAdmin && (
            <StatusRow label={t('usage')}>
              <UsageValue />
            </StatusRow>
          )}
        </dl>
        <div className='flex flex-col gap-2'>
          <h3 className='px-0.5 font-normal text-[var(--text-muted)] text-small'>
            {t('recentRuns')}
          </h3>
          {runsError && !runPages ? (
            <p className='px-0.5 text-[var(--text-muted)] text-small'>{t('runsUnavailable')}</p>
          ) : runsPending || runsFromOtherWorkspace ? (
            <Skeleton className='h-[120px] w-full rounded-lg' />
          ) : runs.length === 0 ? (
            <p className='px-0.5 text-[var(--text-muted)] text-small'>{t('noRuns')}</p>
          ) : (
            <ul className='flex flex-col'>
              {runs.map((run) => {
                const status = toRunStatus(run.status)
                return (
                  <li key={run.id}>
                    <Link
                      href={
                        run.executionId
                          ? `/workspace/${workspaceId}/logs?executionId=${run.executionId}`
                          : `/workspace/${workspaceId}/logs`
                      }
                      className='flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--selection)] focus-visible:outline-offset-2'
                    >
                      <Badge variant={RUN_STATUS_VARIANT[status]} size='sm' dot>
                        {t(`runStatus.${status}`)}
                      </Badge>
                      <OverflowText
                        label={run.workflow?.name || run.jobTitle || t('deletedWorkflow')}
                        focusTarget='nearest-interactive'
                        className='flex-1 text-[var(--text-body)] text-small'
                      />
                      <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                        {format.relativeTime(new Date(run.createdAt), now)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </HomeSection>
  )
}
