import { cn } from '@sim/emcn'
import { RefreshCw } from '@sim/emcn/icons'
import type { useTranslations } from 'next-intl'
import type { ResourceAction } from '@/app/workspace/[workspaceId]/components/resource/components/resource-header'

interface RefreshIconProps {
  className?: string
}

function SpinningRefreshIcon(props: RefreshIconProps) {
  return <RefreshCw {...props} animate />
}

function NewLogsIndicator({ className }: RefreshIconProps) {
  return (
    <span className={cn(className, 'inline-flex items-center justify-center')} aria-hidden='true'>
      <span className='size-1.5 rounded-full bg-[var(--brand-blue)]' />
    </span>
  )
}

interface LogsRefreshActionOptions {
  newLogCount: number
  hasUpdates?: boolean
  isRefreshing: boolean
  onRefresh: () => void
  /** Translator scoped to the `logs` namespace. */
  t: ReturnType<typeof useTranslations>
}

export function getLogsRefreshAction({
  newLogCount,
  hasUpdates = false,
  isRefreshing,
  onRefresh,
  t,
}: LogsRefreshActionOptions): ResourceAction {
  const hasNewLogs = newLogCount > 0
  return {
    id: 'refresh',
    text: hasNewLogs
      ? t('actions.newLogs', { count: newLogCount })
      : hasUpdates
        ? t('actions.updatesAvailable')
        : t('actions.refresh'),
    tooltip: hasNewLogs
      ? t('actions.refreshToSeeNew')
      : hasUpdates
        ? t('actions.refreshToSeeUpdated')
        : t('actions.refresh'),
    icon: isRefreshing
      ? SpinningRefreshIcon
      : hasNewLogs || hasUpdates
        ? NewLogsIndicator
        : RefreshCw,
    onSelect: onRefresh,
    disabled: isRefreshing,
  }
}
