'use client'

import { Badge, Chip, cn, Skeleton } from '@sim/emcn'
import { Lock } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { NexoraTraceSummary } from '@/lib/api/contracts/nexora-traces'
import { formatCo2, formatDuration } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'

interface TraceListProps {
  traces: NexoraTraceSummary[]
  selectedId: string
  locale: string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onSelect: (traceId: string) => void
  onLoadMore: () => void
}

export function TraceListSkeleton() {
  return (
    <div className='flex flex-col gap-1'>
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className='h-[68px] w-full rounded-lg' />
      ))}
    </div>
  )
}

/** The traces, newest first; the selected one opens in the detail panel. */
export function TraceList({
  traces,
  selectedId,
  locale,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onLoadMore,
}: TraceListProps) {
  const t = useTranslations('traces')
  const time = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' })

  return (
    <div className='flex flex-col gap-1'>
      {traces.map((trace) => (
        <button
          key={trace.id}
          type='button'
          aria-pressed={trace.id === selectedId}
          onClick={() => onSelect(trace.id)}
          className={cn(
            'flex w-full flex-col gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover-hover:bg-[var(--surface-4)]',
            trace.id === selectedId && 'bg-[var(--surface-4)]'
          )}
        >
          <div className='flex items-center gap-2'>
            <span className='min-w-0 flex-1 truncate font-medium text-[var(--text-body)] text-small'>
              {trace.name}
            </span>
            {trace.visibility === 'private' && (
              <Lock
                aria-label={t('list.private')}
                className='size-[14px] text-[var(--text-icon)]'
              />
            )}
            <Badge variant='gray' size='sm'>
              {t(`sources.${trace.source}` as 'sources.agent')}
            </Badge>
            {trace.status === 'error' && (
              <Badge variant='red' size='sm'>
                {t('list.error')}
              </Badge>
            )}
          </div>
          <div className='flex flex-wrap gap-x-3 text-[var(--text-muted)] text-caption'>
            <span>{time.format(new Date(trace.startedAt))}</span>
            {trace.model && <span className='font-mono'>{trace.model}</span>}
            <span>{formatDuration(trace.durationMs, locale)}</span>
            <span>{t('list.tokens', { count: trace.inputTokens + trace.outputTokens })}</span>
            <span>{formatCo2(trace.kgCo2eq, locale)}</span>
          </div>
          {trace.inputPreview && (
            <p className='truncate text-[var(--text-secondary)] text-caption'>
              {trace.inputPreview}
            </p>
          )}
        </button>
      ))}
      {hasNextPage && (
        <Chip
          variant='border'
          className='self-center'
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
        >
          {isFetchingNextPage ? t('list.loadingMore') : t('list.loadMore')}
        </Chip>
      )}
    </div>
  )
}
