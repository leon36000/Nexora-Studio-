import type { ConnectorAccessMode } from '@/lib/api/contracts/knowledge/connectors'
import { effectiveConnectorSyncIntervalMinutes } from '@/lib/knowledge/connectors/access-modes'

/** Message keys under `knowledge.syncFrequency.hints`. */
export type ConnectorSyncFrequencyHintKey =
  | 'manual'
  | 'memberPermissionsHourly'
  | 'permissionsHourly'

/**
 * Explain when permission refresh requires a more frequent pass than content indexing.
 * Returns the message key of the hint (`knowledge.syncFrequency.hints.<key>`), translated at render.
 */
export function connectorSyncFrequencyHint(
  accessMode: ConnectorAccessMode,
  syncInterval: number,
  hasContentCredential: boolean
): ConnectorSyncFrequencyHintKey | undefined {
  if (accessMode === 'workspace') return undefined
  if (syncInterval === 0) return 'manual'
  if (effectiveConnectorSyncIntervalMinutes(accessMode, syncInterval) === syncInterval) {
    return undefined
  }
  return accessMode === 'members' && hasContentCredential
    ? 'memberPermissionsHourly'
    : 'permissionsHourly'
}

/** Sync cadences; `labelKey` is under `knowledge.syncFrequency.intervals`. */
export const SYNC_INTERVALS = [
  { labelKey: 'live', value: 5, requiresMax: true },
  { labelKey: 'hourly', value: 60, requiresMax: false },
  { labelKey: 'every6Hours', value: 360, requiresMax: false },
  { labelKey: 'daily', value: 1440, requiresMax: false },
  { labelKey: 'weekly', value: 10080, requiresMax: false },
  { labelKey: 'manual', value: 0, requiresMax: false },
] as const
