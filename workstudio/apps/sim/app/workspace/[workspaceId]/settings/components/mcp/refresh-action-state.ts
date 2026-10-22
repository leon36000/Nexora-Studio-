import type { MutationStatus } from '@tanstack/react-query'
import type { useTranslations } from 'next-intl'
import type { RefreshMcpServerResult } from '@/lib/api/contracts/mcp'
import type { SettingsAction } from '@/app/workspace/[workspaceId]/settings/components/settings-header/settings-header'

interface RefreshActionStateInput {
  mutationStatus: MutationStatus
  connectionStatus?: RefreshMcpServerResult['status']
  workflowsUpdated?: number
}

type RefreshActionState = Pick<SettingsAction, 'text' | 'textTone' | 'disabled'>

/** `t` is scoped to `settings.mcp.refresh`. */
export function getRefreshActionState(
  { mutationStatus, connectionStatus, workflowsUpdated }: RefreshActionStateInput,
  t: ReturnType<typeof useTranslations>
): RefreshActionState {
  if (mutationStatus === 'pending') {
    return { text: t('refreshing'), textTone: undefined, disabled: true }
  }

  if (
    mutationStatus === 'error' ||
    (mutationStatus === 'success' && connectionStatus !== 'connected')
  ) {
    return { text: t('failed'), textTone: 'error', disabled: false }
  }

  if (mutationStatus === 'success') {
    const text = workflowsUpdated ? t('synced', { count: workflowsUpdated }) : t('refreshed')
    return { text, textTone: undefined, disabled: true }
  }

  return { text: t('refreshTools'), textTone: undefined, disabled: false }
}
