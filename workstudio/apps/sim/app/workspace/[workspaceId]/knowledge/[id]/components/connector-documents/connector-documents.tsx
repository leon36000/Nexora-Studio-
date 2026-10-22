'use client'

import { Chip, ChipInput, ChipLink, Skeleton } from '@sim/emcn'
import { RefreshCw, Search, SquareArrowUpRight } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { ConnectorDocumentFilter } from '@/lib/api/contracts/knowledge/connectors'
import { getDocumentIndexingStatus } from '@/lib/knowledge/documents/types'
import { ConnectorDocumentStatusFilter } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connector-documents/connector-document-status-filter'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import {
  useConnectorDocuments,
  useExcludeConnectorDocument,
  useRestoreConnectorDocument,
} from '@/hooks/queries/kb/connectors'
import { useUpdateDocument } from '@/hooks/queries/kb/knowledge'

interface ConnectorDocumentsProps {
  knowledgeBaseId: string
  connectorId: string
  search?: string
  searchControl?: { value: string; onChange: (value: string) => void }
  showToolbar?: boolean
  filter: ConnectorDocumentFilter
  onFilterChange: (filter: ConnectorDocumentFilter) => void
}

export function ConnectorDocuments({
  knowledgeBaseId,
  connectorId,
  filter,
  search,
  searchControl,
  showToolbar = true,
  onFilterChange,
}: ConnectorDocumentsProps) {
  const t = useTranslations('knowledge.connectorDocuments')
  const query = useConnectorDocuments(knowledgeBaseId, connectorId, {
    filter,
    search,
  })
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query
  const isLoading = query.isLoading || query.isPlaceholderData
  const excludeMutation = useExcludeConnectorDocument()
  const restoreMutation = useRestoreConnectorDocument()
  const retryMutation = useUpdateDocument()
  const mutationError = excludeMutation.error ?? restoreMutation.error ?? retryMutation.error
  const isRecoveryPending =
    excludeMutation.isPending || restoreMutation.isPending || retryMutation.isPending
  const documents = (data?.pages.flatMap((page) => page.documents) ?? []).filter((document) =>
    filter === 'excluded'
      ? document.userExcluded
      : !document.userExcluded &&
        (filter === 'active' || getDocumentIndexingStatus(document) === filter)
  )
  const counts = data?.pages[0]?.counts ?? { active: 0, excluded: 0, failed: 0, skipped: 0 }
  const visibleDocumentCount = counts[filter]
  const hasMoreVisibleDocuments = Boolean(hasNextPage && documents.length < visibleDocumentCount)

  function resetRecoveryErrors() {
    excludeMutation.reset()
    restoreMutation.reset()
    retryMutation.reset()
  }

  return (
    <>
      <div className='flex flex-col gap-4'>
        {showToolbar && (
          <div className='flex items-center gap-2'>
            {searchControl && (
              <ChipInput
                icon={Search}
                placeholder={t('searchPlaceholder')}
                value={searchControl.value}
                onChange={(event) => searchControl.onChange(event.target.value)}
                autoComplete='off'
                className='min-w-0 flex-1'
              />
            )}
            <ConnectorDocumentStatusFilter
              filter={filter}
              onFilterChange={onFilterChange}
              counts={counts}
              isLoading={isLoading}
            />
          </div>
        )}
        <div className={RESOURCE_LIST_STACK}>
          {query.isError && !query.isFetchNextPageError ? (
            <SettingsQueryErrorState
              error={query.error}
              isRetrying={query.isFetching}
              onRetry={() => query.refetch()}
              fallback={t('loadFailed')}
              variant='inline'
            />
          ) : isLoading ? (
            <>
              <Skeleton className='h-10 w-full rounded-lg' />
              <Skeleton className='h-10 w-full rounded-lg' />
            </>
          ) : visibleDocumentCount === 0 ? (
            <SettingsEmptyState variant='inline'>
              {search?.trim()
                ? t('empty.search')
                : filter === 'excluded'
                  ? t('empty.excluded')
                  : filter === 'failed'
                    ? t('empty.failed')
                    : filter === 'skipped'
                      ? t('empty.skipped')
                      : t('empty.none')}
            </SettingsEmptyState>
          ) : (
            documents.map((doc) => (
              <SettingsResourceRow
                key={doc.id}
                title={doc.filename}
                description={
                  getDocumentIndexingStatus(doc) === 'failed'
                    ? t('status.failed')
                    : getDocumentIndexingStatus(doc) === 'skipped'
                      ? doc.processingError
                        ? t('status.skippedWithReason', { reason: doc.processingError })
                        : t('status.skipped')
                      : doc.processingStatus === 'pending'
                        ? t('status.pending')
                        : doc.processingStatus === 'processing'
                          ? t('status.processing')
                          : undefined
                }
                trailing={
                  <div className='flex items-center gap-2'>
                    {doc.sourceUrl && (
                      <ChipLink
                        href={doc.sourceUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        leftIcon={SquareArrowUpRight}
                        aria-label={t('open', { name: doc.filename })}
                      />
                    )}
                    {getDocumentIndexingStatus(doc) === 'failed' && !doc.userExcluded && (
                      <Chip
                        disabled={isRecoveryPending}
                        onClick={() => {
                          resetRecoveryErrors()
                          retryMutation.mutate({
                            knowledgeBaseId,
                            documentId: doc.id,
                            updates: { retryProcessing: true },
                          })
                        }}
                      >
                        {t('retryIndexing')}
                      </Chip>
                    )}
                    <Chip
                      leftIcon={doc.userExcluded ? RefreshCw : undefined}
                      disabled={isRecoveryPending}
                      onClick={() => {
                        resetRecoveryErrors()
                        doc.userExcluded
                          ? restoreMutation.mutate({
                              knowledgeBaseId,
                              connectorId,
                              documentIds: [doc.id],
                            })
                          : excludeMutation.mutate({
                              knowledgeBaseId,
                              connectorId,
                              documentIds: [doc.id],
                            })
                      }}
                    >
                      {doc.userExcluded ? t('restore') : t('exclude')}
                    </Chip>
                  </div>
                }
              />
            ))
          )}
          {query.isFetchNextPageError ? (
            <SettingsQueryErrorState
              error={query.error}
              fallback={t('loadMoreFailed')}
              isRetrying={isFetchingNextPage}
              onRetry={() => void fetchNextPage()}
              variant='inline'
            />
          ) : !isLoading && hasMoreVisibleDocuments ? (
            <Chip disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? t('loading') : t('loadMore')}
            </Chip>
          ) : null}
        </div>
      </div>
      {mutationError && (
        <p role='alert' className='py-4 text-center text-[var(--text-error)] text-sm'>
          {mutationError.message}
        </p>
      )}
    </>
  )
}
