'use client'

import { memo } from 'react'
import { badgeVariants, cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { BADGE_STYLE } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/terminal/types'

/**
 * Inline running badge for valid content inside a native terminal row button.
 */
const RunningBadge = memo(function RunningBadge() {
  const t = useTranslations('editor.runPanels.terminal.status')
  return (
    <span className={cn(badgeVariants({ variant: 'green' }), BADGE_STYLE)}>{t('running')}</span>
  )
})

/**
 * Props for StatusDisplay component
 */
export interface StatusDisplayProps {
  isRunning: boolean
  isCanceled: boolean
  formattedDuration: string
}

/**
 * Reusable status display for terminal rows.
 * Shows Running badge, 'canceled' text, or formatted duration.
 */
export const StatusDisplay = memo(function StatusDisplay({
  isRunning,
  isCanceled,
  formattedDuration,
}: StatusDisplayProps) {
  const t = useTranslations('editor.runPanels.terminal.status')
  if (isRunning) {
    return <RunningBadge />
  }
  if (isCanceled) {
    return <>{t('canceled')}</>
  }
  return <>{formattedDuration}</>
})
