'use client'

import { useMemo, useState } from 'react'
import { Chip } from '@sim/emcn'
import { RefreshCw, Settings } from '@sim/emcn/icons'
import { useLocale, useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { SEARCH_DEBOUNCE_MS } from '@/lib/url-state'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state/settings-empty-state'
import { TraceDetail } from '@/app/workspace/[workspaceId]/traces/components/trace-detail'
import {
  TraceFilters,
  type TraceFilterValues,
} from '@/app/workspace/[workspaceId]/traces/components/trace-filters'
import {
  TraceList,
  TraceListSkeleton,
} from '@/app/workspace/[workspaceId]/traces/components/trace-list'
import { TraceSettingsModal } from '@/app/workspace/[workspaceId]/traces/components/trace-settings-modal'
import { tracesParsers, tracesUrlKeys } from '@/app/workspace/[workspaceId]/traces/search-params'
import { durationFilterMs, periodStart } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'
import {
  type TraceListFilters,
  useNexoraTraceFacets,
  useNexoraTraceSettings,
  useNexoraTraces,
} from '@/hooks/queries/nexora-traces'
import { useDebounce } from '@/hooks/use-debounce'
import { useDebouncedSearchSetter } from '@/hooks/use-debounced-search-setter'

const MINUTE_MS = 60_000

interface TracesProps {
  workspaceId: string
}

/**
 * Nexora edition: every model call of the workspace as a trace — filters on top, the traces on
 * the left, the open trace's tree of steps on the right. Instance administrators also reach the
 * traces of no workspace (instance keys) and the trace settings.
 */
export function Traces({ workspaceId }: TracesProps) {
  const t = useTranslations('traces')
  const locale = useLocale()
  const [params, setParams] = useQueryStates(tracesParsers, tracesUrlKeys)
  const setSearch = useDebouncedSearchSetter((value, options) =>
    setParams({ search: value }, options)
  )
  const query = useDebounce(params.search.trim(), SEARCH_DEBOUNCE_MS)
  const settings = useNexoraTraceSettings()
  const isInstanceAdmin = Boolean(settings.data)
  const scope = params.instance && isInstanceAdmin ? 'instance' : workspaceId
  const facets = useNexoraTraceFacets(workspaceId)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const periodAnchor = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS
  const filters = useMemo<TraceListFilters>(
    () => ({
      status: params.status ?? undefined,
      source: params.source ?? undefined,
      model: params.model || undefined,
      agentId: params.agent || undefined,
      apiKeyId: params.key || undefined,
      minDurationMs: params.duration ? durationFilterMs(params.duration) : undefined,
      from: params.period ? periodStart(params.period, new Date(periodAnchor)) : undefined,
      q: query || undefined,
    }),
    [
      params.status,
      params.source,
      params.model,
      params.agent,
      params.key,
      params.duration,
      params.period,
      query,
      periodAnchor,
    ]
  )
  const traces = useNexoraTraces(scope, filters)
  const rows = useMemo(() => traces.data?.pages.flatMap((page) => page.traces) ?? [], [traces.data])
  const filtered = Object.values(filters).some((value) => value !== undefined)

  const values: TraceFilterValues = {
    search: params.search,
    status: params.status,
    source: params.source,
    model: params.model,
    agent: params.agent,
    key: params.key,
    duration: params.duration,
    period: params.period,
  }

  let body
  if (traces.isPending) {
    body = <TraceListSkeleton />
  } else if (!traces.data) {
    body = (
      <SettingsQueryErrorState
        error={null}
        fallback={t('errors.loadFailed')}
        isRetrying={traces.isFetching}
        onRetry={() => void traces.refetch()}
      />
    )
  } else if (rows.length === 0) {
    body = (
      <SettingsEmptyState variant='inline'>
        {filtered ? t('list.emptyFiltered') : t('list.empty')}
      </SettingsEmptyState>
    )
  } else {
    body = (
      <TraceList
        traces={rows}
        selectedId={params.trace}
        locale={locale}
        hasNextPage={Boolean(traces.hasNextPage)}
        isFetchingNextPage={traces.isFetchingNextPage}
        onSelect={(traceId) => void setParams({ trace: traceId }, { history: 'push' })}
        onLoadMore={() => void traces.fetchNextPage()}
      />
    )
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[72rem] flex-col gap-4 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='min-w-0 font-medium text-[var(--text-body)] text-lg'>{t('page.title')}</h1>
          <div className='flex shrink-0 items-center gap-1'>
            {isInstanceAdmin && (
              <Chip
                active={scope === 'instance'}
                onClick={() =>
                  void setParams({ instance: scope === 'instance' ? null : '1', trace: null })
                }
              >
                {t('page.instanceTraces')}
              </Chip>
            )}
            <Chip leftIcon={RefreshCw} onClick={() => void traces.refetch()}>
              {t('page.refresh')}
            </Chip>
            {settings.data && (
              <Chip leftIcon={Settings} onClick={() => setSettingsOpen(true)}>
                {t('page.settings')}
              </Chip>
            )}
          </div>
        </header>
        <TraceFilters
          values={values}
          facets={scope === 'instance' ? undefined : facets.data}
          locale={locale}
          onSearch={setSearch}
          onChange={(patch) => void setParams(patch)}
        />
        <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
          <div className='min-w-0'>{body}</div>
          <aside className='min-w-0 rounded-lg border border-[var(--border)] p-3 lg:sticky lg:top-4 lg:self-start'>
            {params.trace ? (
              <TraceDetail scope={scope} traceId={params.trace} locale={locale} />
            ) : (
              <p className='text-[var(--text-muted)] text-small'>{t('detail.empty')}</p>
            )}
          </aside>
        </div>
      </div>
      {settings.data && (
        <TraceSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings.data.settings}
          lastExport={settings.data.lastExport}
        />
      )}
    </div>
  )
}
