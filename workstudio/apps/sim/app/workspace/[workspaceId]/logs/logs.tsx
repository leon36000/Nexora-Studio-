'use client'

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Calendar,
  ChipCombobox,
  type ComboboxOption,
  cn,
  Library,
  OverflowText,
  Popover,
  PopoverAnchor,
  PopoverContent,
  toast,
} from '@sim/emcn'
import { Download, Workflow } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { formatDuration } from '@sim/utils/formatting'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import type {
  WorkflowLogDetail,
  WorkflowLogRow,
  WorkflowLogSummary,
} from '@/lib/api/contracts/logs'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getContextMenuPosition } from '@/lib/core/utils/context-menu'
import { formatDateShort } from '@/lib/core/utils/date-display'
import {
  getEndDateFromTimeRange,
  getStartDateFromTimeRange,
  hasActiveFilters,
} from '@/lib/logs/filters'
import { getTriggerOptions } from '@/lib/logs/get-trigger-options'
import { type ParsedFilter, parseQuery, queryToApiParams } from '@/lib/logs/query-parser'
import {
  type FolderData,
  SearchSuggestions,
  type TriggerData,
  type WorkflowData,
} from '@/lib/logs/search-suggestions'
import { SEARCH_DEBOUNCE_MS } from '@/lib/url-state'
import { LogsEmptyState } from '@/app/workspace/[workspaceId]/components/resource/components/resource-empty-state'
import type { ResourceAction } from '@/app/workspace/[workspaceId]/components/resource/components/resource-header'
import type {
  FilterTag,
  SearchConfig,
  SortConfig,
} from '@/app/workspace/[workspaceId]/components/resource/components/resource-options'
import { isResourceListEmpty } from '@/app/workspace/[workspaceId]/components/resource/is-resource-list-empty'
import type {
  ResourceColumn,
  ResourceRow,
} from '@/app/workspace/[workspaceId]/components/resource/resource'
import {
  Resource,
  type ResourceTableHandle,
} from '@/app/workspace/[workspaceId]/components/resource/resource'
import {
  SnapshotBoundary,
  SnapshotModalFallback,
} from '@/app/workspace/[workspaceId]/logs/components/log-details/components/execution-snapshot/snapshot-boundary'
import { getLogsRefreshAction } from '@/app/workspace/[workspaceId]/logs/components/log-refresh-action'
import { useLogFilters } from '@/app/workspace/[workspaceId]/logs/hooks/use-log-filters'
import { useSearchState } from '@/app/workspace/[workspaceId]/logs/hooks/use-search-state'
import {
  executionIdParam,
  executionIdWriteOptions,
  logDetailsTabParam,
  logDetailsTabUrlKeys,
  logFilterUrlKeys,
  logSortParams,
} from '@/app/workspace/[workspaceId]/logs/search-params'
import type { Suggestion } from '@/app/workspace/[workspaceId]/logs/types'
import { useRegisterGlobalCommands } from '@/app/workspace/[workspaceId]/providers/global-commands-provider'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { getBlock } from '@/blocks/registry'
import { useFolderMap, useFolders } from '@/hooks/queries/folders'
import {
  prefetchLogDetail,
  useCancelExecution,
  useDashboardStats,
  useLogByExecutionId,
  useLogDetail,
  useLogSnapshotUpdates,
  useLogsSnapshot,
  useNewLogCount,
  useRetryExecution,
} from '@/hooks/queries/logs'
import { useWorkflowMap, useWorkflows } from '@/hooks/queries/workflows'
import { useDateFormat } from '@/hooks/use-date-format'
import { useDebounce } from '@/hooks/use-debounce'
import { useUrlSort } from '@/hooks/use-url-sort'
import { useFilterStore } from '@/stores/logs/filters/store'
import { CORE_TRIGGER_TYPES, type TimeRange } from '@/stores/logs/filters/types'
import { Dashboard, LogDetails, LogRowContextMenu } from './components'
import {
  coreTriggerLabelKey,
  formatDate,
  getDisplayStatus,
  getLogWorkflowLabel,
  type LogStatus,
  parseDuration,
  resolveLogWorkflowId,
  STATUS_CONFIG,
  StatusBadge,
  TriggerBadge,
  workflowEditorPath,
} from './utils'

/**
 * Lazy per the code-splitting rule in `sim-imports.md`: the snapshot renders the workflow
 * preview canvas, whose graph is ~7.6 MB of source (the editor's sub-block components and
 * the generated tool metadata). Both render sites are gated on client-only state (a preview
 * selection / an opened detail), so the chunk is fetched on first use, never during SSR or
 * hydration. The now-dead barrel re-export is deleted — with no `sideEffects: false`, a
 * leftover re-export would silently defeat this split.
 */
const ExecutionSnapshot = lazy(() =>
  import(
    '@/app/workspace/[workspaceId]/logs/components/log-details/components/execution-snapshot/execution-snapshot'
  ).then((m) => ({ default: m.ExecutionSnapshot }))
)

const LOGS_PER_PAGE = 50 as const
const LIVE_REFRESH_INTERVAL_MS = 10_000 as const
const ACTIVE_RUN_DETAIL_REFRESH_MS = 3_000 as const

const LOG_COLUMN_IDS = ['workflow', 'date', 'status', 'cost', 'trigger', 'duration'] as const

interface LogSelectionState {
  selectedLogId: string | null
  isSidebarOpen: boolean
}

type LogSelectionAction =
  | { type: 'TOGGLE_LOG'; logId: string }
  | { type: 'SELECT_LOG'; logId: string }
  | { type: 'CLOSE_SIDEBAR' }
  | { type: 'TOGGLE_SIDEBAR' }

function logSelectionReducer(
  state: LogSelectionState,
  action: LogSelectionAction
): LogSelectionState {
  switch (action.type) {
    case 'TOGGLE_LOG':
      if (state.selectedLogId === action.logId && state.isSidebarOpen) {
        return { selectedLogId: null, isSidebarOpen: false }
      }
      return { selectedLogId: action.logId, isSidebarOpen: true }
    case 'SELECT_LOG':
      return { ...state, selectedLogId: action.logId }
    case 'CLOSE_SIDEBAR':
      return { selectedLogId: null, isSidebarOpen: false }
    case 'TOGGLE_SIDEBAR':
      return state.selectedLogId ? { ...state, isSidebarOpen: !state.isSidebarOpen } : state
    default:
      return state
  }
}

/** Time range values (URL/filter data) in menu order, with their message keys under `logs.timeRanges`. */
const TIME_RANGE_KEYS: readonly (readonly [TimeRange, string])[] = [
  ['All time', 'allTime'],
  ['Past 30 minutes', 'past30Minutes'],
  ['Past hour', 'pastHour'],
  ['Past 6 hours', 'past6Hours'],
  ['Past 12 hours', 'past12Hours'],
  ['Past 24 hours', 'past24Hours'],
  ['Past 3 days', 'past3Days'],
  ['Past 7 days', 'past7Days'],
  ['Past 14 days', 'past14Days'],
  ['Past 30 days', 'past30Days'],
  ['Custom range', 'customRange'],
] as const

const TIME_RANGE_KEY_BY_VALUE = new Map<string, string>(TIME_RANGE_KEYS)

const colorIconCache = new Map<string, React.ComponentType<{ className?: string }>>()

function getColorIcon(color: string): React.ComponentType<{ className?: string }> {
  const cached = colorIconCache.get(color)
  if (cached) return cached

  const ColorIcon = ({ className }: { className?: string }) => (
    <div
      className={cn(className, 'shrink-0 rounded-[3px]')}
      style={{
        backgroundColor: color,
        width: 10,
        height: 10,
      }}
    />
  )
  ColorIcon.displayName = `ColorIcon(${color})`
  colorIconCache.set(color, ColorIcon)
  return ColorIcon
}

function WorkflowOptionIcon({ className }: { className?: string }) {
  return <Workflow className={cn(className, 'shrink-0 text-[var(--text-icon)]')} />
}

function getTriggerIcon(
  triggerType: string
): React.ComponentType<{ className?: string }> | undefined {
  if ((CORE_TRIGGER_TYPES as readonly string[]).includes(triggerType)) return undefined
  const block = getBlock(triggerType)
  if (!block?.icon) return undefined
  const BlockIcon = block.icon
  const TriggerIcon = ({ className }: { className?: string }) => (
    <BlockIcon className={cn(className, 'shrink-0')} style={{ width: 12, height: 12 }} />
  )
  TriggerIcon.displayName = `TriggerIcon(${triggerType})`
  return TriggerIcon
}

function activeRunRefetchInterval(query: { state: { data?: WorkflowLogDetail } }) {
  const status = query.state.data?.status
  return status === 'running' || status === 'pending' || status === 'redacting'
    ? ACTIVE_RUN_DETAIL_REFRESH_MS
    : false
}

/**
 * Logs page component displaying workflow execution history.
 * Supports filtering, search, live updates, and detailed log inspection.
 * @returns The logs page view with table and sidebar details
 */
export default function Logs() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const t = useTranslations('logs')
  const { locale } = useDateFormat()

  const {
    timeRange,
    startDate,
    endDate,
    level,
    workflowIds,
    folderIds,
    setWorkflowIds,
    searchQuery: urlSearchQuery,
    setSearchQuery: setUrlSearchQuery,
    triggers,
    resetFilters,
    setLevel,
    setFolderIds,
    setTriggers,
    setTimeRange,
    clearDateRange,
  } = useLogFilters()

  const viewMode = useFilterStore((s) => s.viewMode)
  const setViewMode = useFilterStore((s) => s.setViewMode)
  const isDashboardView = viewMode === 'dashboard'

  const [{ selectedLogId, isSidebarOpen }, dispatch] = useReducer(logSelectionReducer, {
    selectedLogId: null,
    isSidebarOpen: false,
  })

  const [executionId, setExecutionId] = useQueryState(executionIdParam.key, executionIdParam.parser)
  const [pendingExecutionId, setPendingExecutionId] = useState<string | null>(() => executionId)

  /**
   * The log-details `tab` param is owned/written by the details panel, but the
   * orchestrator must clear it when the panel closes so a lingering `?tab=trace`
   * never carries over to the next log opened from the list.
   */
  const [, setLogDetailsTab] = useQueryState(logDetailsTabParam.key, {
    ...logDetailsTabParam.parser,
    ...logDetailsTabUrlKeys,
  })

  /**
   * `urlSearchQuery` is the instant nuqs value (its URL write is debounced inside
   * `useLogFilters`); the query/filtering still debounce off it to avoid
   * per-keystroke fetches. The raw value is written to the URL, so trim here on
   * read — the server keeps receiving a trimmed query.
   */
  const debouncedSearchQuery = useDebounce(urlSearchQuery, SEARCH_DEBOUNCE_MS).trim()

  const [isExporting, setIsExporting] = useState(false)
  const logsRef = useRef<WorkflowLogSummary[]>([])
  const selectedLogIndexRef = useRef(-1)
  const selectedLogIdRef = useRef<string | null>(null)
  const isSidebarOpenRef = useRef(false)
  const shouldScrollIntoViewRef = useRef(false)
  const resourceTableRef = useRef<ResourceTableHandle>(null)
  const activeViewRefetchRef = useRef<() => Promise<unknown>>(async () => {}) // i18n-ignore: generic type, not text
  const activeLogRefetchRef = useRef<() => void>(() => {})
  const activeLogTabRef = useRef<string>('overview')
  const logsQueryRef = useRef({ isFetching: false, hasNextPage: false, fetchNextPage: () => {} })

  /**
   * URL-backed sort (`sort` + `dir`). The defaults match the server's default
   * ordering, so a clean URL means "no active sort" and clearing the sort
   * writes the defaults back (which `clearOnDefault` strips from the URL).
   */
  const {
    sort: sortBy,
    dir: sortOrder,
    activeSort,
    onSort,
    onClear: onClearSort,
  } = useUrlSort(logSortParams, logFilterUrlKeys)
  const userPermissions = useUserPermissionsContext()

  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuLog, setContextMenuLog] = useState<WorkflowLogSummary | null>(null)

  const [previewLogId, setPreviewLogId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const selectedDetailQuery = useLogDetail(selectedLogId ?? undefined, workspaceId, {
    enabled: isSidebarOpen,
    refetchInterval: activeRunRefetchInterval,
  })

  const previewDetailQuery = useLogDetail(previewLogId ?? undefined, workspaceId, {
    refetchInterval: activeRunRefetchInterval,
  })

  const logFilters = useMemo(
    () => ({
      timeRange,
      startDate,
      endDate,
      level,
      workflowIds,
      folderIds,
      triggers,
      searchQuery: debouncedSearchQuery,
      limit: LOGS_PER_PAGE,
      sortBy,
      sortOrder,
    }),
    [
      timeRange,
      startDate,
      endDate,
      level,
      workflowIds,
      folderIds,
      triggers,
      debouncedSearchQuery,
      sortBy,
      sortOrder,
    ]
  )

  const logsQuery = useLogsSnapshot(workspaceId, logFilters, {
    enabled: !isDashboardView || isSidebarOpen,
  })
  const newLogsQuery = useNewLogCount(
    workspaceId,
    logFilters,
    logsQuery.isPlaceholderData ? undefined : logsQuery.data?.pages[0]?.snapshotAt,
    { enabled: !isDashboardView }
  )
  const newLogCount = newLogsQuery.data ?? 0
  const hasChangedPage = logsQuery.data?.pages.some((page) => page.snapshotChanged) === true
  const snapshotUpdatesQuery = useLogSnapshotUpdates(
    workspaceId,
    logsQuery.isPlaceholderData ? undefined : logsQuery.data?.pages[0],
    { enabled: !isDashboardView && newLogCount === 0 && !hasChangedPage }
  )
  const hasSnapshotUpdates = snapshotUpdatesQuery.data || hasChangedPage

  const dashboardFilters = useMemo(
    () => ({
      timeRange,
      startDate,
      endDate,
      level,
      workflowIds,
      folderIds,
      triggers,
      searchQuery: debouncedSearchQuery,
    }),
    [timeRange, startDate, endDate, level, workflowIds, folderIds, triggers, debouncedSearchQuery]
  )

  const dashboardStatsQuery = useDashboardStats(workspaceId, dashboardFilters, {
    enabled: isDashboardView,
    refetchInterval: LIVE_REFRESH_INTERVAL_MS,
  })

  const logs = useMemo(() => {
    return logsQuery.data?.pages?.flatMap((page) => page.logs) ?? []
  }, [logsQuery.data?.pages])

  const selectedLogIndex = selectedLogId ? logs.findIndex((l) => l.id === selectedLogId) : -1
  const selectedLogFromList = selectedLogIndex >= 0 ? logs[selectedLogIndex] : null
  const selectedLog = selectedDetailQuery.data ?? selectedLogFromList ?? null

  const handleLogHover = useCallback(
    (rowId: string) => {
      prefetchLogDetail(queryClient, rowId, workspaceId)
    },
    [queryClient, workspaceId]
  )

  useFolders(workspaceId)

  logsRef.current = logs
  selectedLogIndexRef.current = selectedLogIndex
  selectedLogIdRef.current = selectedLogId
  isSidebarOpenRef.current = isSidebarOpen
  activeViewRefetchRef.current = () =>
    Promise.all([
      ...(isDashboardView ? [dashboardStatsQuery.refetch({ throwOnError: true })] : []),
      ...(!isDashboardView || isSidebarOpen ? [logsQuery.refetch({ throwOnError: true })] : []),
    ])
  activeLogRefetchRef.current = selectedDetailQuery.refetch
  logsQueryRef.current = {
    isFetching: logsQuery.isFetching,
    hasNextPage: logsQuery.hasNextPage ?? false,
    fetchNextPage: logsQuery.fetchNextPage,
  }

  const deepLinkQuery = useLogByExecutionId(workspaceId, pendingExecutionId)

  useEffect(() => {
    if (!pendingExecutionId) return
    const resolvedId = deepLinkQuery.data?.id
    if (resolvedId) {
      dispatch({ type: 'TOGGLE_LOG', logId: resolvedId })
      setPendingExecutionId(null)
    } else if (deepLinkQuery.isError) {
      setPendingExecutionId(null)
    }
  }, [pendingExecutionId, deepLinkQuery.data, deepLinkQuery.isError])

  /**
   * The single write path for user-driven `executionId` changes. Cancels any
   * in-flight deep-link resolution first — an explicit interaction supersedes
   * it, otherwise the resolved row would open over the user's selection and
   * leave the URL pointing at a different run than the panel shows.
   */
  const writeExecutionId = useCallback(
    (value: string | null) => {
      setPendingExecutionId(null)
      void setExecutionId(value, executionIdWriteOptions)
    },
    [setExecutionId]
  )

  /**
   * Mirrors the reducer's TOGGLE_LOG branch: clicking the already-open row
   * closes the sidebar (strip `executionId`); any other click opens the row
   * (sync `executionId` to it so the URL always deep-links the open run).
   */
  const handleLogClick = useCallback(
    (rowId: string) => {
      const opens = !(selectedLogIdRef.current === rowId && isSidebarOpenRef.current)
      dispatch({ type: 'TOGGLE_LOG', logId: rowId })
      if (opens) {
        const log = logsRef.current.find((l) => l.id === rowId)
        writeExecutionId(log?.executionId ?? null)
      } else {
        writeExecutionId(null)
      }
    },
    [writeExecutionId]
  )

  const handleNavigateNext = useCallback(() => {
    const idx = selectedLogIndexRef.current
    const currentLogs = logsRef.current
    const canGoNext = idx >= 0 && idx < currentLogs.length - 1 // i18n-ignore: comparison, not text
    if (canGoNext) {
      const nextLog = currentLogs[idx + 1]
      shouldScrollIntoViewRef.current = true
      dispatch({ type: 'SELECT_LOG', logId: nextLog.id })
      if (isSidebarOpenRef.current) {
        writeExecutionId(nextLog.executionId ?? null)
      }
    }
  }, [writeExecutionId])

  const handleNavigatePrev = useCallback(() => {
    const idx = selectedLogIndexRef.current
    if (idx > 0) {
      const prevLog = logsRef.current[idx - 1]
      shouldScrollIntoViewRef.current = true
      dispatch({ type: 'SELECT_LOG', logId: prevLog.id })
      if (isSidebarOpenRef.current) {
        writeExecutionId(prevLog.executionId ?? null)
      }
    }
  }, [writeExecutionId])

  const handleCloseSidebar = useCallback(() => {
    dispatch({ type: 'CLOSE_SIDEBAR' })
    writeExecutionId(null)
    activeLogTabRef.current = 'overview'
  }, [writeExecutionId])

  /**
   * Strip the `tab` param whenever the detail panel transitions from open to
   * closed — by the X button, toggling the same row, or the keyboard — so
   * reopening another log starts on overview rather than inheriting the closed
   * log's tab. Guarded on a prior-open ref so an initial deep-linked `?tab=` is
   * preserved (the panel isn't open yet on first mount).
   */
  const wasSidebarOpenRef = useRef(false)
  useEffect(() => {
    if (isSidebarOpen) {
      wasSidebarOpenRef.current = true
    } else if (wasSidebarOpenRef.current) {
      wasSidebarOpenRef.current = false
      setLogDetailsTab(null)
    }
  }, [isSidebarOpen, setLogDetailsTab])

  const handleActiveTabChange = useCallback((tab: string) => {
    activeLogTabRef.current = tab
  }, [])

  const handleLogContextMenu = useCallback(
    (e: React.MouseEvent, rowId: string) => {
      e.preventDefault()
      const log = logs.find((l) => l.id === rowId) ?? null
      setContextMenuPosition(getContextMenuPosition(e))
      setContextMenuLog(log)
      setContextMenuOpen(true)
    },
    [logs]
  )

  const handleCopyExecutionId = useCallback(() => {
    if (contextMenuLog?.executionId) {
      navigator.clipboard.writeText(contextMenuLog.executionId).catch(() => {})
    }
  }, [contextMenuLog])

  const handleCopyLink = useCallback(() => {
    if (contextMenuLog?.executionId) {
      const url = `${window.location.origin}/workspace/${workspaceId}/logs?executionId=${contextMenuLog.executionId}`
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }, [contextMenuLog, workspaceId])

  const handleOpenWorkflow = useCallback(() => {
    const wfId = contextMenuLog ? resolveLogWorkflowId(contextMenuLog) : null
    if (wfId) {
      window.open(workflowEditorPath(workspaceId, wfId), '_blank')
    }
  }, [contextMenuLog, workspaceId])

  const handleToggleWorkflowFilter = useCallback(() => {
    const wfId = contextMenuLog?.workflow?.id || contextMenuLog?.workflowId
    if (!wfId) return

    if (workflowIds.length === 1 && workflowIds[0] === wfId) {
      setWorkflowIds([])
    } else {
      setWorkflowIds([wfId])
    }
  }, [contextMenuLog, workflowIds, setWorkflowIds])

  /**
   * `resetFilters()` already clears `search` (sets it to null), so no separate
   * search reset is needed here.
   */
  const handleClearAllFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  const handleOpenPreview = useCallback(() => {
    if (contextMenuLog?.id) {
      setPreviewLogId(contextMenuLog.id)
    }
  }, [contextMenuLog])

  const cancelExecution = useCancelExecution(workspaceId)
  const retryExecution = useRetryExecution()

  const handleCancelExecution = useCallback(async () => {
    const workflowId = contextMenuLog?.workflow?.id || contextMenuLog?.workflowId
    const executionId = contextMenuLog?.executionId
    if (!userPermissions.canEdit || !workflowId || !executionId) return

    try {
      await cancelExecution.mutateAsync({ workflowId, executionId })
      toast.success(t('list.runStopped'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('list.stopRunFailed')))
    }
  }, [contextMenuLog, userPermissions.canEdit, t])

  const retryLog = useCallback(
    async (log: WorkflowLogRow | null) => {
      const workflowId = log?.workflow?.id || log?.workflowId
      const executionId = log?.executionId
      if (!workflowId || !executionId) return

      try {
        await retryExecution.mutateAsync({ workflowId, executionId })
        toast.success(t('list.retryStarted'))
      } catch {
        toast.error(t('list.retryFailed'))
      }
    },
    [t]
  )

  const handleRetryExecution = useCallback(() => {
    retryLog(contextMenuLog)
  }, [contextMenuLog, retryLog])

  const handleRetrySidebarExecution = useCallback(() => {
    retryLog(selectedLog)
  }, [selectedLog, retryLog])

  const contextMenuWorkflowId = contextMenuLog?.workflow?.id || contextMenuLog?.workflowId
  const isFilteredByThisWorkflow = Boolean(
    contextMenuWorkflowId && workflowIds.length === 1 && workflowIds[0] === contextMenuWorkflowId
  )

  const filtersActive = hasActiveFilters({
    timeRange,
    level,
    workflowIds,
    folderIds,
    triggers,
    searchQuery: debouncedSearchQuery,
  })

  useEffect(() => {
    if (!selectedLogId || !shouldScrollIntoViewRef.current) return
    shouldScrollIntoViewRef.current = false
    // Route through the virtualizer; a querySelector would miss windowed-out rows.
    resourceTableRef.current?.scrollToRow(selectedLogId)
  }, [selectedLogId, selectedLogIndex])

  const effectiveSidebarOpen =
    isSidebarOpen && (selectedLogIndex !== -1 || !!selectedDetailQuery.data)

  const handleRefresh = useCallback(async () => {
    if (selectedLogIdRef.current && isSidebarOpenRef.current) {
      activeLogRefetchRef.current()
    }
    try {
      await activeViewRefetchRef.current()
    } catch (error) {
      toast.error(getErrorMessage(error, t('list.refreshFailed')))
    }
  }, [t])

  const isVisuallyRefreshing = isDashboardView
    ? dashboardStatsQuery.isFetching || (isSidebarOpen && logsQuery.isFetching)
    : logsQuery.isFetching

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('workspaceId', workspaceId)
      if (level !== 'all') params.set('level', level)
      if (triggers.length > 0) params.set('triggers', triggers.join(','))
      if (workflowIds.length > 0) params.set('workflowIds', workflowIds.join(','))
      if (folderIds.length > 0) params.set('folderIds', folderIds.join(','))

      const computedStartDate = getStartDateFromTimeRange(timeRange, startDate)
      if (computedStartDate) {
        params.set('startDate', computedStartDate.toISOString())
      }

      const computedEndDate = getEndDateFromTimeRange(timeRange, endDate)
      if (computedEndDate) {
        params.set('endDate', computedEndDate.toISOString())
      }

      const parsed = parseQuery(debouncedSearchQuery)
      const extra = queryToApiParams(parsed)
      Object.entries(extra).forEach(([k, v]) => params.set(k, v))

      const url = `/api/logs/export?${params.toString()}`
      const a = document.createElement('a')
      a.href = url
      a.download = 'logs_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setIsExporting(false)
    }
  }, [
    workspaceId,
    level,
    triggers,
    workflowIds,
    folderIds,
    timeRange,
    startDate,
    endDate,
    debouncedSearchQuery,
  ])

  useRegisterGlobalCommands(() => [
    { id: 'logs-refresh', handler: () => handleRefresh() },
    { id: 'logs-export', handler: () => void handleExport() },
    { id: 'logs-show-dashboard', handler: () => setViewMode('dashboard') },
    { id: 'logs-show-logs', handler: () => setViewMode('logs') },
  ])

  const loadMoreLogs = useCallback(() => {
    const { isFetching, hasNextPage, fetchNextPage } = logsQueryRef.current
    if (!isFetching && hasNextPage) {
      fetchNextPage()
    }
  }, [])

  const handleNavigateNextEvent = useEffectEvent(handleNavigateNext)
  const handleNavigatePrevEvent = useEffectEvent(handleNavigatePrev)
  const writeExecutionIdEvent = useEffectEvent((value: string | null) => {
    writeExecutionId(value)
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (activeLogTabRef.current === 'trace') return
      const currentLogs = logsRef.current
      const currentIndex = selectedLogIndexRef.current
      if (currentLogs.length === 0) return

      if (currentIndex === -1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        shouldScrollIntoViewRef.current = true
        dispatch({ type: 'SELECT_LOG', logId: currentLogs[0].id })
        return
      }

      if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && currentIndex > 0) {
        e.preventDefault()
        handleNavigatePrevEvent()
      }

      if (
        e.key === 'ArrowDown' &&
        !e.metaKey &&
        !e.ctrlKey &&
        currentIndex < currentLogs.length - 1
      ) {
        e.preventDefault()
        handleNavigateNextEvent()
      }

      if (e.key === 'Enter' && selectedLogIdRef.current) {
        e.preventDefault()
        const willOpen = !isSidebarOpenRef.current
        dispatch({ type: 'TOGGLE_SIDEBAR' })
        if (willOpen) {
          const log = currentLogs.find((l) => l.id === selectedLogIdRef.current)
          writeExecutionIdEvent(log?.executionId ?? null)
        } else {
          writeExecutionIdEvent(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCloseContextMenu = useCallback(() => setContextMenuOpen(false), [])
  function handleClosePreview() {
    setPreviewLogId(null)
  }

  const rows: ResourceRow[] = useMemo(
    () =>
      logs.map((log) => {
        const formattedDate = formatDate(log.createdAt, locale)
        const displayStatus = getDisplayStatus(log.status)
        const workflowName = getLogWorkflowLabel(log, {
          untitledJob: t('workflow.untitledJob'),
          unknown: t('workflow.unknown'),
          deleted: t('workflow.deleted'),
        })

        const durationMs = parseDuration({ duration: log.duration ?? undefined })
        const durationText =
          durationMs != null ? (formatDuration(durationMs, { precision: 2 }) ?? '—') : '—'

        const costCredits =
          typeof log.cost?.total === 'number' ? dollarsToCredits(log.cost.total) : null
        const costText =
          costCredits !== null
            ? t('list.credits', { count: costCredits, formatted: costCredits.toLocaleString() })
            : '—'

        return {
          id: log.id,
          cells: {
            workflow: {
              label: workflowName,
            },
            date: { label: `${formattedDate.compactDate} ${formattedDate.compactTime}` },
            status: { content: <StatusBadge status={displayStatus} /> },
            cost: { label: costText },
            trigger: { content: <TriggerBadge trigger={log.trigger || 'manual'} /> },
            duration: { label: durationText },
          },
        }
      }),
    [logs, t, locale]
  )

  const hasNextLog = selectedLogIndex >= 0 && selectedLogIndex < logs.length - 1 // i18n-ignore: comparison, not text
  const sidebarOverlay = (
    <LogDetails
      log={selectedLog}
      isOpen={effectiveSidebarOpen}
      onClose={handleCloseSidebar}
      onNavigateNext={handleNavigateNext}
      onNavigatePrev={handleNavigatePrev}
      hasNext={hasNextLog}
      hasPrev={selectedLogIndex > 0}
      onRetryExecution={handleRetrySidebarExecution}
      isRetryPending={retryExecution.isPending}
      onActiveTabChange={handleActiveTabChange}
    />
  )

  const { data: allWorkflows = {} } = useWorkflowMap(workspaceId)
  const { data: folders = {} } = useFolderMap(workspaceId)

  const filterTags = useMemo<FilterTag[]>(() => {
    const tags: FilterTag[] = []

    if (level && level !== 'all') {
      const statuses = level.split(',').filter(Boolean)
      const labels = statuses.map((s) => (s in STATUS_CONFIG ? t(`status.${s}`) : s))
      tags.push({
        label: t('filterTags.status', { values: labels.join(', ') }),
        onRemove: () => setLevel('all'),
      })
    }

    if (workflowIds.length > 0) {
      const names = workflowIds.map((id) => allWorkflows[id]?.name ?? id.slice(0, 8))
      tags.push({
        label: t('filterTags.workflow', { values: names.join(', ') }),
        onRemove: () => setWorkflowIds([]),
      })
    }

    if (folderIds.length > 0) {
      const names = folderIds.map((id) => folders[id]?.name ?? id.slice(0, 8))
      tags.push({
        label: t('filterTags.folder', { values: names.join(', ') }),
        onRemove: () => setFolderIds([]),
      })
    }

    if (triggers.length > 0) {
      tags.push({
        label: t('filterTags.trigger', { values: triggers.join(', ') }),
        onRemove: () => setTriggers([]),
      })
    }

    if (timeRange !== 'All time') {
      tags.push({
        label:
          timeRange === 'Custom range' && startDate && endDate
            ? `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`
            : t(`timeRanges.${TIME_RANGE_KEY_BY_VALUE.get(timeRange) ?? 'allTime'}`),
        onRemove: () => {
          clearDateRange()
          setTimeRange('All time')
        },
      })
    }

    return tags
  }, [
    level,
    setLevel,
    workflowIds,
    setWorkflowIds,
    allWorkflows,
    folderIds,
    setFolderIds,
    folders,
    triggers,
    setTriggers,
    timeRange,
    startDate,
    endDate,
    clearDateRange,
    setTimeRange,
    t,
  ])

  /** Logs has no folder navigation, so the graphic means "nothing has ever run here". */
  const showEmptyState = isResourceListEmpty({
    rowCount: rows.length,
    isLoading: logsQuery.isLoading,
    isPlaceholderData: logsQuery.isPlaceholderData,
    error: logsQuery.error,
    search: debouncedSearchQuery,
    filterCount: filterTags.length,
  })

  const workflowsData = useMemo<WorkflowData[]>(
    () =>
      Object.values(allWorkflows).map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
      })),
    [allWorkflows]
  )
  const foldersData = useMemo<FolderData[]>(
    () => Object.values(folders).map((f) => ({ id: f.id, name: f.name })),
    [folders]
  )
  const triggersData = useMemo<TriggerData[]>(
    () =>
      getTriggerOptions().map((option) => {
        const labelKey = coreTriggerLabelKey(option.value)
        return {
          value: option.value,
          label: labelKey ? t(`triggers.${labelKey}`) : option.label,
          color: option.color,
        }
      }),
    [t]
  )
  const suggestionEngine = useMemo(
    () => new SearchSuggestions(workflowsData, foldersData, triggersData),
    [workflowsData, foldersData, triggersData]
  )

  const handleFiltersChange = useCallback(
    (filters: ParsedFilter[], textSearch: string) => {
      const filterStrings = filters.map(
        (f) => `${f.field}:${f.operator !== '=' ? f.operator : ''}${f.originalValue}`
      )
      const fullQuery = [...filterStrings, textSearch].filter(Boolean).join(' ')
      setUrlSearchQuery(fullQuery)
    },
    [setUrlSearchQuery]
  )

  const getSuggestions = useCallback(
    (input: string) => suggestionEngine.getSuggestions(input),
    [suggestionEngine]
  )

  const {
    appliedFilters,
    currentInput,
    textSearch,
    isOpen: isSuggestionsOpen,
    suggestions,
    sections,
    highlightedIndex,
    highlightedBadgeIndex,
    inputRef: searchInputRef,
    dropdownRef: searchDropdownRef,
    handleInputChange: handleSearchInputChange,
    handleSuggestionSelect,
    handleKeyDown: handleSearchKeyDown,
    handleFocus: handleSearchFocus,
    handleBlur: handleSearchBlur,
    removeBadge,
    clearAll: clearSearch,
    setHighlightedIndex,
    initializeFromQuery,
  } = useSearchState({
    onFiltersChange: handleFiltersChange,
    getSuggestions,
  })

  const lastExternalSearchValue = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (urlSearchQuery === lastExternalSearchValue.current) return
    const isMount = lastExternalSearchValue.current === undefined
    lastExternalSearchValue.current = urlSearchQuery
    // On mount with no initial query, skip the no-op parse
    if (isMount && !urlSearchQuery) return
    const parsed = parseQuery(urlSearchQuery)
    initializeFromQuery(parsed.textSearch, parsed.filters)
  }, [urlSearchQuery, initializeFromQuery])

  useEffect(() => {
    if (!isSuggestionsOpen || highlightedIndex < 0) return
    const container = searchDropdownRef.current
    const el = container?.querySelector(`[data-index="${highlightedIndex}"]`)
    if (container && el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isSuggestionsOpen, highlightedIndex])

  const suggestionsDropdown = useMemo(() => {
    if (!isSuggestionsOpen || suggestions.length === 0) return undefined
    const suggestionType =
      sections.length > 0 ? 'multi-section' : (suggestions[0]?.category ?? null)

    return (
      <div className='max-h-96 overflow-y-auto px-1'>
        {sections.length > 0 ? (
          <div className='py-1'>
            {suggestions[0]?.category === 'show-all' && (
              <SuggestionButton
                suggestion={suggestions[0]}
                index={0}
                highlighted={highlightedIndex === 0}
                onHover={setHighlightedIndex}
                onSelect={handleSuggestionSelect}
              />
            )}
            {sections.map((section) => (
              <div key={section.title}>
                <div className='px-3 py-1.5 text-[var(--text-tertiary)] text-caption uppercase tracking-wide'>
                  {section.title}
                </div>
                {section.suggestions.map((suggestion) => {
                  if (suggestion.category === 'show-all') return null
                  const index = suggestions.indexOf(suggestion)
                  return (
                    <SuggestionButton
                      key={suggestion.id}
                      suggestion={suggestion}
                      index={index}
                      highlighted={index === highlightedIndex}
                      onHover={setHighlightedIndex}
                      onSelect={handleSuggestionSelect}
                      showCategory
                    />
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className='py-1'>
            {suggestionType === 'filters' && (
              <div className='px-3 py-1.5 text-[var(--text-tertiary)] text-caption uppercase tracking-wide'>
                {t('list.suggestedFilters')}
              </div>
            )}
            {suggestions.map((suggestion, index) => (
              <SuggestionButton
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                highlighted={index === highlightedIndex}
                onHover={setHighlightedIndex}
                onSelect={handleSuggestionSelect}
              />
            ))}
          </div>
        )}
      </div>
    )
  }, [
    isSuggestionsOpen,
    suggestions,
    sections,
    highlightedIndex,
    setHighlightedIndex,
    handleSuggestionSelect,
    t,
  ])

  const searchTags = useMemo(
    () => [
      ...appliedFilters.map((f, i) => ({
        label: f.field,
        value: `${f.operator !== '=' ? f.operator : ''}${f.originalValue}`,
        onRemove: () => removeBadge(i),
      })),
      ...(textSearch
        ? [
            {
              label: t('list.searchTag'),
              value: textSearch,
              onRemove: () => handleFiltersChange(appliedFilters, ''),
            },
          ]
        : []),
    ],
    [appliedFilters, textSearch, removeBadge, handleFiltersChange, t]
  )

  const sortConfig = useMemo<SortConfig>(
    () => ({
      options: [
        { id: 'date', label: t('columns.date') },
        { id: 'duration', label: t('columns.duration') },
        { id: 'cost', label: t('columns.cost') },
        { id: 'status', label: t('columns.status') },
      ],
      active: activeSort,
      onSort,
      onClear: onClearSort,
    }),
    [activeSort, onSort, onClearSort, t]
  )

  const searchConfig = useMemo<SearchConfig>(
    () => ({
      value: currentInput,
      onChange: handleSearchInputChange,
      placeholder: t('list.searchPlaceholder'),
      inputRef: searchInputRef,
      onKeyDown: handleSearchKeyDown,
      onFocus: handleSearchFocus,
      onBlur: handleSearchBlur,
      tags: searchTags.length > 0 ? searchTags : undefined,
      highlightedTagIndex: highlightedBadgeIndex,
      onClearAll: clearSearch,
      dropdown: suggestionsDropdown,
      dropdownRef: searchDropdownRef,
    }),
    [
      currentInput,
      handleSearchInputChange,
      searchInputRef,
      handleSearchKeyDown,
      handleSearchFocus,
      handleSearchBlur,
      searchTags,
      highlightedBadgeIndex,
      clearSearch,
      suggestionsDropdown,
      searchDropdownRef,
      t,
    ]
  )

  const hasExportableLogs = isDashboardView
    ? !dashboardStatsQuery.isPlaceholderData && (dashboardStatsQuery.data?.totalRuns ?? 0) > 0
    : !logsQuery.isPlaceholderData && logs.length > 0

  const headerActions = useMemo<ResourceAction[]>(
    () => [
      {
        text: t('actions.export'),
        icon: Download,
        onSelect: handleExport,
        disabled: !userPermissions.canEdit || isExporting || !hasExportableLogs,
      },
      getLogsRefreshAction({
        newLogCount: isDashboardView ? 0 : newLogCount,
        hasUpdates: !isDashboardView && hasSnapshotUpdates,
        isRefreshing: isVisuallyRefreshing,
        onRefresh: handleRefresh,
        t,
      }),
      {
        text: t('actions.logs'),
        onSelect: () => setViewMode('logs'),
        active: !isDashboardView,
      },
      {
        text: t('actions.dashboard'),
        onSelect: () => setViewMode('dashboard'),
        active: isDashboardView,
      },
    ],
    [
      isDashboardView,
      setViewMode,
      newLogCount,
      hasSnapshotUpdates,
      isVisuallyRefreshing,
      handleRefresh,
      handleExport,
      userPermissions.canEdit,
      isExporting,
      hasExportableLogs,
      t,
    ]
  )

  const logColumns = useMemo<ResourceColumn[]>(
    () => LOG_COLUMN_IDS.map((id) => ({ id, header: t(`columns.${id}`) })),
    [t]
  )

  return (
    <>
      <Resource>
        <Resource.Header icon={Library} title={t('page.title')} actions={headerActions} />
        <Resource.Options
          search={searchConfig}
          sort={sortConfig}
          filter={{
            content: (
              <LogsFilterPanel
                searchQuery={urlSearchQuery}
                onSearchQueryChange={setUrlSearchQuery}
              />
            ),
          }}
          filterTags={filterTags}
        />
        {isDashboardView ? (
          <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-6'>
              <Dashboard
                stats={dashboardStatsQuery.data}
                isLoading={dashboardStatsQuery.isLoading}
                error={dashboardStatsQuery.error}
                searchQuery={debouncedSearchQuery}
              />
            </div>
            {sidebarOverlay}
          </div>
        ) : (
          <Resource.Table
            apiRef={resourceTableRef}
            virtualized
            columns={logColumns}
            rows={rows}
            emptyState={showEmptyState ? <LogsEmptyState /> : undefined}
            selectedRowId={selectedLogId}
            onRowClick={handleLogClick}
            onRowHover={handleLogHover}
            onRowContextMenu={handleLogContextMenu}
            onLoadMore={loadMoreLogs}
            hasMore={logsQuery.hasNextPage ?? false}
            isLoadingMore={logsQuery.isFetchingNextPage}
            overlay={sidebarOverlay}
          />
        )}
      </Resource>

      <LogRowContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={handleCloseContextMenu}
        log={contextMenuLog}
        onCopyExecutionId={handleCopyExecutionId}
        onCopyLink={handleCopyLink}
        onOpenWorkflow={handleOpenWorkflow}
        onOpenPreview={handleOpenPreview}
        onCancelExecution={handleCancelExecution}
        onRetryExecution={handleRetryExecution}
        canCancelExecution={userPermissions.canEdit}
        isCancelPending={cancelExecution.isPending}
        cancelPendingExecutionId={cancelExecution.variables?.executionId}
        isRetryPending={retryExecution.isPending}
        onToggleWorkflowFilter={handleToggleWorkflowFilter}
        onClearAllFilters={handleClearAllFilters}
        isFilteredByThisWorkflow={isFilteredByThisWorkflow}
        hasActiveFilters={filtersActive}
      />

      {previewLogId !== null && previewDetailQuery.data?.executionId && (
        <SnapshotBoundary
          key={previewDetailQuery.data.executionId}
          isOpen
          onLoadError={handleClosePreview}
        >
          <Suspense fallback={<SnapshotModalFallback isOpen onClose={handleClosePreview} />}>
            <ExecutionSnapshot
              executionId={previewDetailQuery.data.executionId}
              traceSpans={previewDetailQuery.data.executionData?.traceSpans}
              isModal
              isOpen={previewLogId !== null}
              onClose={handleClosePreview}
            />
          </Suspense>
        </SnapshotBoundary>
      )}
    </>
  )
}

interface LogsFilterPanelProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

function LogsFilterPanel({ searchQuery, onSearchQueryChange }: LogsFilterPanelProps) {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const t = useTranslations('logs')

  const {
    level,
    setLevel,
    workflowIds,
    setWorkflowIds,
    folderIds,
    setFolderIds,
    triggers,
    setTriggers,
    timeRange,
    setTimeRange,
    startDate,
    endDate,
    setDateRange,
    clearDateRange,
    resetFilters,
  } = useLogFilters()

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const previousTimeRangeRef = useRef(timeRange)
  const dateRangeAppliedRef = useRef(false)
  const { data: folders = {} } = useFolderMap(workspaceId)
  const { data: allWorkflowList = [] } = useWorkflows(workspaceId)

  const workflows = allWorkflowList.map((w) => ({ id: w.id, name: w.name }))
  const folderList = Object.values(folders).filter((f) => f.workspaceId === workspaceId)

  const selectedStatuses = level === 'all' || !level ? [] : level.split(',').filter(Boolean)

  const statusOptions: ComboboxOption[] = useMemo(
    () =>
      (Object.keys(STATUS_CONFIG) as LogStatus[])
        .filter((status) => STATUS_CONFIG[status].filterable)
        .map((status) => ({
          value: status,
          label: t(`status.${status}`),
          icon: getColorIcon(STATUS_CONFIG[status].color),
        })),
    [t]
  )

  const handleStatusChange = (values: string[]) => {
    setLevel(values.length === 0 ? 'all' : values.join(','))
  }

  const statusDisplayLabel =
    selectedStatuses.length === 0
      ? t('filters.status')
      : selectedStatuses.length === 1
        ? statusOptions.find((s) => s.value === selectedStatuses[0])?.label ||
          t('filters.selectedCount', { count: 1 })
        : t('filters.selectedCount', { count: selectedStatuses.length })

  const selectedStatusColor =
    selectedStatuses.length === 1
      ? (STATUS_CONFIG[selectedStatuses[0] as LogStatus]?.color ?? null)
      : null

  const workflowOptions: ComboboxOption[] = workflows.map((w) => ({
    value: w.id,
    label: w.name,
    icon: WorkflowOptionIcon,
  }))

  const workflowDisplayLabel =
    workflowIds.length === 0
      ? t('filters.workflow')
      : workflowIds.length === 1
        ? workflows.find((w) => w.id === workflowIds[0])?.name ||
          t('filters.selectedCount', { count: 1 })
        : t('filters.workflowCount', { count: workflowIds.length })

  const selectedWorkflow =
    workflowIds.length === 1 ? workflows.find((w) => w.id === workflowIds[0]) : null

  const folderOptions: ComboboxOption[] = folderList.map((f) => ({ value: f.id, label: f.name }))

  const folderDisplayLabel =
    folderIds.length === 0
      ? t('filters.folder')
      : folderIds.length === 1
        ? folderList.find((f) => f.id === folderIds[0])?.name ||
          t('filters.selectedCount', { count: 1 })
        : t('filters.folderCount', { count: folderIds.length })

  const triggerOptions: ComboboxOption[] = useMemo(
    () =>
      getTriggerOptions().map((option) => {
        const labelKey = coreTriggerLabelKey(option.value)
        return {
          value: option.value,
          label: labelKey ? t(`triggers.${labelKey}`) : option.label,
          icon: getTriggerIcon(option.value),
        }
      }),
    [t]
  )

  const timeRangeOptions: ComboboxOption[] = useMemo(
    () => TIME_RANGE_KEYS.map(([value, key]) => ({ value, label: t(`timeRanges.${key}`) })),
    [t]
  )

  const triggerDisplayLabel =
    triggers.length === 0
      ? t('filters.trigger')
      : triggers.length === 1
        ? triggerOptions.find((option) => option.value === triggers[0])?.label ||
          t('filters.selectedCount', { count: 1 })
        : t('filters.triggerCount', { count: triggers.length })

  const timeDisplayLabel =
    timeRange === 'All time'
      ? t('filters.time')
      : timeRange === 'Custom range' && startDate && endDate
        ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
        : t(`timeRanges.${TIME_RANGE_KEY_BY_VALUE.get(timeRange) ?? 'allTime'}`)

  const handleTimeRangeChange = (val: string) => {
    if (val === 'Custom range') {
      previousTimeRangeRef.current = timeRange
      setDatePickerOpen(true)
    } else {
      clearDateRange()
      setTimeRange(val as typeof timeRange)
    }
  }

  const handleDateRangeApply = (start: string, end: string) => {
    dateRangeAppliedRef.current = true
    setDateRange(start, end)
    setDatePickerOpen(false)
  }

  const handleDatePickerCancel = () => {
    if (timeRange === 'Custom range' && !startDate) {
      setTimeRange(previousTimeRangeRef.current)
    }
    setDatePickerOpen(false)
  }

  const filtersActive = hasActiveFilters({
    timeRange,
    level,
    workflowIds,
    folderIds,
    triggers,
    searchQuery,
  })

  const handleClearFilters = () => {
    resetFilters()
    onSearchQueryChange('')
  }

  return (
    <div className='flex w-[240px] flex-col gap-4 p-3'>
      <div className='flex flex-col gap-[9px]'>
        <span className='text-[var(--text-muted)] text-small'>{t('filters.status')}</span>
        <ChipCombobox
          options={statusOptions}
          multiSelect
          multiSelectValues={selectedStatuses}
          onMultiSelectChange={handleStatusChange}
          placeholder={t('filters.allStatuses')}
          overlayLabel={statusDisplayLabel}
          overlayContent={
            <span className='flex w-full min-w-0 items-center gap-1.5 text-[var(--text-primary)]'>
              {selectedStatusColor && (
                <div
                  className='shrink-0 rounded-[3px]'
                  style={{ backgroundColor: selectedStatusColor, width: 8, height: 8 }}
                />
              )}
              <span className='min-w-0 flex-1'>{statusDisplayLabel}</span>
            </span>
          }
          showAllOption
          allOptionLabel={t('filters.allStatuses')}
          className='w-full'
        />
      </div>

      <div className='flex flex-col gap-[9px]'>
        <span className='text-[var(--text-muted)] text-small'>{t('filters.workflow')}</span>
        <ChipCombobox
          options={workflowOptions}
          multiSelect
          multiSelectValues={workflowIds}
          onMultiSelectChange={setWorkflowIds}
          placeholder={t('filters.allWorkflows')}
          overlayLabel={workflowDisplayLabel}
          overlayContent={
            <span className='flex w-full min-w-0 items-center gap-1.5 text-[var(--text-primary)]'>
              {selectedWorkflow && (
                <Workflow className='size-[14px] shrink-0 text-[var(--text-icon)]' />
              )}
              <span className='min-w-0 flex-1'>{workflowDisplayLabel}</span>
            </span>
          }
          searchable
          searchPlaceholder={t('filters.searchWorkflows')}
          showAllOption
          allOptionLabel={t('filters.allWorkflows')}
          className='w-full'
        />
      </div>

      <div className='flex flex-col gap-[9px]'>
        <span className='text-[var(--text-muted)] text-small'>{t('filters.folder')}</span>
        <ChipCombobox
          options={folderOptions}
          multiSelect
          multiSelectValues={folderIds}
          onMultiSelectChange={setFolderIds}
          placeholder={t('filters.allFolders')}
          overlayLabel={folderDisplayLabel}
          overlayContent={folderDisplayLabel}
          searchable
          searchPlaceholder={t('filters.searchFolders')}
          showAllOption
          allOptionLabel={t('filters.allFolders')}
          className='w-full'
        />
      </div>

      <div className='flex flex-col gap-[9px]'>
        <span className='text-[var(--text-muted)] text-small'>{t('filters.trigger')}</span>
        <ChipCombobox
          options={triggerOptions}
          multiSelect
          multiSelectValues={triggers}
          onMultiSelectChange={setTriggers}
          placeholder={t('filters.allTriggers')}
          overlayLabel={triggerDisplayLabel}
          overlayContent={triggerDisplayLabel}
          searchable
          searchPlaceholder={t('filters.searchTriggers')}
          showAllOption
          allOptionLabel={t('filters.allTriggers')}
          className='w-full'
        />
      </div>

      <div className='flex flex-col gap-[9px]'>
        <span className='text-[var(--text-muted)] text-small'>{t('filters.timeRange')}</span>
        <div className='relative'>
          <ChipCombobox
            options={timeRangeOptions}
            value={timeRange}
            onChange={handleTimeRangeChange}
            placeholder={t('timeRanges.allTime')}
            overlayLabel={timeDisplayLabel}
            overlayContent={timeDisplayLabel}
            className='w-full'
            maxHeight={320}
          />
          <Popover
            open={datePickerOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                if (dateRangeAppliedRef.current) {
                  dateRangeAppliedRef.current = false
                } else {
                  handleDatePickerCancel()
                }
              }
            }}
          >
            <PopoverAnchor className='pointer-events-none absolute inset-0' />
            <PopoverContent align='start' sideOffset={4} className='w-auto p-0'>
              <Calendar
                mode='range'
                showTime
                startDate={startDate}
                endDate={endDate}
                onRangeChange={handleDateRangeApply}
                onCancel={handleDatePickerCancel}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filtersActive && (
        <Button
          variant='active'
          onClick={handleClearFilters}
          className='h-[32px] w-full rounded-md'
        >
          {t('filters.clearAll')}
        </Button>
      )}
    </div>
  )
}

function SuggestionButton({
  suggestion,
  index,
  highlighted,
  onHover,
  onSelect,
  showCategory,
}: {
  suggestion: Suggestion
  index: number
  highlighted: boolean
  onHover: (i: number) => void
  onSelect: (s: Suggestion) => void
  showCategory?: boolean
}) {
  return (
    <Button
      type='button'
      variant='ghost'
      data-index={index}
      className={cn(
        'h-auto w-full justify-start rounded-md px-3 py-2 text-left transition-colors hover-hover:bg-[var(--surface-5)]',
        highlighted && 'bg-[var(--surface-5)]'
      )}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => {
        e.preventDefault()
        onSelect(suggestion)
      }}
    >
      <div className='flex w-full items-center justify-between gap-3'>
        <OverflowText label={suggestion.label} className='flex-1 text-small' />
        {showCategory && suggestion.value !== suggestion.label && (
          <div className='shrink-0 font-mono text-[var(--text-muted)] text-xs'>
            {suggestion.category === 'workflow' || suggestion.category === 'folder'
              ? `${suggestion.category}:`
              : ''}
          </div>
        )}
        {!showCategory && suggestion.description && (
          <div className='shrink-0 text-[var(--text-muted)] text-xs'>{suggestion.value}</div>
        )}
      </div>
    </Button>
  )
}
