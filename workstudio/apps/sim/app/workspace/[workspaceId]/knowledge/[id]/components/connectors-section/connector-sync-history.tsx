'use client'

import { cn } from '@sim/emcn'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import type {
  ConnectorData,
  ConnectorDetailData,
  ConnectorMemberSummary,
  MemberSyncLogData,
  SyncLogData,
} from '@/lib/api/contracts/knowledge/connectors'
import {
  CONNECTOR_SYNC_STALE_LOCK_TTL_MS,
  MEMBER_SYNC_STALE_LOCK_TTL_MS,
} from '@/lib/knowledge/connectors/sync-limits'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { useConnectorDetail } from '@/hooks/queries/kb/connectors'

interface ConnectorSyncHistoryProps {
  connector: ConnectorData
  knowledgeBaseId: string
  detail?: ConnectorDetailData
}

export function ConnectorSyncHistory({
  connector,
  knowledgeBaseId,
  detail,
}: ConnectorSyncHistoryProps) {
  const t = useTranslations('knowledge.connectors.history')
  const query = useConnectorDetail(
    detail ? undefined : knowledgeBaseId,
    detail ? undefined : connector.id
  )
  const isLoading = !detail && (query.isLoading || query.isPlaceholderData)
  const data = detail ?? query.data
  if (!detail && query.isError) {
    return (
      <SettingsQueryErrorState
        error={query.error}
        fallback={t('loadFailed')}
        isRetrying={query.isFetching}
        onRetry={() => void query.refetch()}
        variant='inline'
      />
    )
  }
  return connector.accessMode === 'members' ? (
    <MemberSyncHistory
      logs={isLoading ? [] : (data?.memberSyncLogs ?? [])}
      members={isLoading ? undefined : data?.members}
      isLoading={isLoading}
    />
  ) : (
    <SyncHistory logs={isLoading ? [] : (data?.syncLogs ?? [])} isLoading={isLoading} />
  )
}

type SyncLogState = 'running' | 'interrupted' | 'failed' | 'completed' | 'partial' | 'continuing'

/** Reclaimed stale locks leave started log rows behind; both views use the engine's own TTL. */
function getSyncLogState(
  log: Pick<SyncLogData, 'status' | 'startedAt'>,
  staleLockTtl: number,
  now: number
): SyncLogState {
  switch (log.status) {
    case 'completed':
    case 'partial':
    case 'failed':
      return log.status
    case 'started':
      return now - new Date(log.startedAt).getTime() > staleLockTtl ? 'interrupted' : 'running'
  }
}

interface SyncHistoryRowProps {
  startedAt: string
  state: SyncLogState
  description?: string
  notice?: string | null
}

function SyncHistoryRow({ startedAt, state, description, notice }: SyncHistoryRowProps) {
  const t = useTranslations('knowledge.connectors.history.logState')
  return (
    <SettingsResourceRow
      title={
        <time dateTime={startedAt}>
          {format(new Date(startedAt), 'MMM d, h:mm a')}
          {state === 'completed' && <span className='sr-only'> · {t(state)}</span>}
        </time>
      }
      description={[description, notice].filter(Boolean).join(' · ') || undefined}
      badge={
        state === 'completed' ? undefined : (
          <span
            className={cn(
              'text-caption',
              state === 'failed' ? 'text-[var(--text-error)]' : 'text-[var(--text-muted)]'
            )}
          >
            {t(state)}
          </span>
        )
      }
    />
  )
}

interface SyncHistoryProps {
  logs: SyncLogData[]
  isLoading: boolean
}

export function SyncHistory({ logs, isLoading }: SyncHistoryProps) {
  const t = useTranslations('knowledge.connectors.history')
  if (isLoading) return <SettingsEmptyState variant='inline'>{t('loading')}</SettingsEmptyState>
  if (logs.length === 0)
    return <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>

  const now = Date.now()
  return (
    <div className={RESOURCE_LIST_STACK}>
      {logs.map((log) => {
        const continuing =
          log.status === 'partial' &&
          log.listedCount === null &&
          log.docsFailed === 0 &&
          !log.errorMessage
        const state = continuing
          ? 'continuing'
          : getSyncLogState(log, CONNECTOR_SYNC_STALE_LOCK_TTL_MS, now)
        const changes = [
          log.docsAdded > 0 && t('added', { count: log.docsAdded }),
          log.docsUpdated > 0 && t('updated', { count: log.docsUpdated }),
          log.docsDeleted > 0 && t('deleted', { count: log.docsDeleted }),
          log.docsFailed > 0 && t('failed', { count: log.docsFailed }),
          log.docsSkipped > 0 && t('skipped', { count: log.docsSkipped }),
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <SyncHistoryRow
            key={log.id}
            startedAt={log.startedAt}
            state={state}
            notice={state === 'failed' ? undefined : log.errorMessage}
            description={
              state === 'failed'
                ? (log.errorMessage ?? undefined)
                : state === 'completed' || state === 'partial' || state === 'continuing'
                  ? changes ||
                    (state === 'continuing' || log.errorMessage ? undefined : t('noChanges'))
                  : undefined
            }
          />
        )
      })}
    </div>
  )
}

interface MemberSyncHistoryProps {
  logs: MemberSyncLogData[]
  members: ConnectorMemberSummary | undefined
  isLoading: boolean
}

/** Several partial member runs can form one drain; they are not failed syncs. */
function MemberSyncHistory({ logs, members, isLoading }: MemberSyncHistoryProps) {
  const t = useTranslations('knowledge.connectors.history')
  if (isLoading)
    return <SettingsEmptyState variant='inline'>{t('loadingMembers')}</SettingsEmptyState>

  const now = Date.now()
  const accountWarnings = [
    members && members.suspended > 0 && t('accountsNeedReconnecting', { count: members.suspended }),
    members && members.stale > 0 && t('accountsStale', { count: members.stale }),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={RESOURCE_LIST_STACK}>
      {accountWarnings && <SettingsResourceRow title={accountWarnings} />}
      {logs.length === 0 ? (
        <SettingsEmptyState variant='inline'>{t('emptyMembers')}</SettingsEmptyState>
      ) : (
        logs.map((log) => {
          const continuing =
            log.status === 'partial' &&
            log.membersIncomplete > 0 &&
            log.membersFailed === 0 &&
            log.docsFailed === 0 &&
            log.processingDispatchFailed === 0 &&
            !log.errorMessage
          const state = continuing
            ? 'continuing'
            : getSyncLogState(log, MEMBER_SYNC_STALE_LOCK_TTL_MS, now)
          const changes = [
            log.docsAdded > 0 && t('added', { count: log.docsAdded }),
            log.docsUpdated > 0 && t('updated', { count: log.docsUpdated }),
            log.docsTombstoned + log.docsPurged > 0 &&
              t('deleted', { count: log.docsTombstoned + log.docsPurged }),
            (log.docsFailed ?? 0) > 0 && t('failed', { count: log.docsFailed ?? 0 }),
            (log.processingDispatchFailed ?? 0) > 0 &&
              t('failedToQueue', { count: log.processingDispatchFailed ?? 0 }),
          ]
            .filter(Boolean)
            .join(' · ')
          const description = [
            changes || (continuing || log.errorMessage ? undefined : t('noChanges')),
            log.membersFailed > 0 && t('accountsFailed', { count: log.membersFailed }),
            log.membersIncomplete > 0 && t('accountsIncomplete', { count: log.membersIncomplete }),
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <SyncHistoryRow
              key={log.id}
              startedAt={log.startedAt}
              state={state}
              notice={state === 'failed' ? undefined : log.errorMessage}
              description={
                state === 'failed'
                  ? (log.errorMessage ?? undefined)
                  : state === 'completed' || state === 'partial' || state === 'continuing'
                    ? description
                    : undefined
              }
            />
          )
        })
      )}
    </div>
  )
}
