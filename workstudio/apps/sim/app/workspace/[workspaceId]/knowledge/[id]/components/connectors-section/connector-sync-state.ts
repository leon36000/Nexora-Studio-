import type { ConnectorData } from '@/lib/api/contracts/knowledge/connectors'
import { isConnectorSyncingOrPending } from '@/hooks/queries/kb/connectors'

const MEMBER_STATUS = {
  idle: 'active',
  pending: 'pending',
  running: 'syncing',
  error: 'error',
  disabled: 'disabled',
} as const

/**
 * Member sync runs independently; an explicit pause or disable still takes precedence.
 * `syncLabelKey` and `syncTooltipKey` are message keys under `knowledge.connectors.sync`.
 */
export function getConnectorSyncState(connector: ConnectorData) {
  const syncsPerMember = connector.accessMode === 'members'
  const syncInFlight = isConnectorSyncingOrPending(connector)
  const canResume = connector.status === 'paused' || connector.status === 'disabled'
  const memberSyncDisabled = syncsPerMember && connector.memberSyncStatus === 'disabled'

  return {
    syncsPerMember,
    syncInFlight,
    canResume,
    syncDisabled: syncInFlight || canResume || memberSyncDisabled,
    effectiveStatus:
      syncsPerMember && connector.status === 'active'
        ? MEMBER_STATUS[connector.memberSyncStatus]
        : connector.status,
    syncLabelKey: (canResume || memberSyncDisabled
      ? 'syncNow'
      : connector.status === 'pending' ||
          (syncsPerMember && connector.memberSyncStatus === 'pending')
        ? 'syncQueued'
        : syncInFlight
          ? 'syncing'
          : 'syncNow') as 'syncNow' | 'syncQueued' | 'syncing',
    syncTooltipKey: (canResume
      ? 'resumeToSync'
      : memberSyncDisabled
        ? 'memberSyncDisabled'
        : undefined) as 'resumeToSync' | 'memberSyncDisabled' | undefined,
    lastSyncAt: syncsPerMember ? connector.lastMemberSyncAt : connector.lastSyncAt,
    nextSyncAt: syncsPerMember ? connector.nextMemberSyncAt : connector.nextSyncAt,
    lastSyncError: syncsPerMember
      ? (connector.lastMemberSyncError ?? connector.lastSyncError)
      : connector.lastSyncError,
  }
}
