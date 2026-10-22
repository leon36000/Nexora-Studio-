'use client'

import { useEffect, useState } from 'react'
import { Chip } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { ConnectorData } from '@/lib/api/contracts/knowledge/connectors'
import { type ResourceScope, resourceScopeFields } from '@/lib/core/resource-scope'
import {
  CREDENTIAL_REMOVED_SYNC_ERROR,
  CREDENTIAL_REVOKED_SYNC_ERROR,
} from '@/lib/knowledge/connectors/sync-limits'
import { getCanonicalScopesForProvider, getProviderIdFromServiceId } from '@/lib/oauth'
import { getMissingRequiredScopes } from '@/lib/oauth/utils'
import { ConnectOAuthModal } from '@/app/workspace/[workspaceId]/components/connect-oauth-modal'
import { SettingsResourceRow } from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { getConnectorRequiredScopes, isConnectorCredentialTypeAllowed } from '@/connectors/auth'
import { CONNECTOR_META_REGISTRY } from '@/connectors/registry'
import { useOAuthCredentials } from '@/hooks/queries/oauth/credentials'
import { useCredentialRefreshTriggers } from '@/hooks/use-credential-refresh-triggers'

interface ConnectorRecoveryProps {
  connector: ConnectorData
  scope: ResourceScope
  knowledgeBaseId: string
  isSearchIndex?: boolean
  canEdit: boolean
  disabled?: boolean
  onEdit?: () => void
}

export function ConnectorRecovery({
  connector,
  scope,
  knowledgeBaseId,
  isSearchIndex = false,
  canEdit,
  disabled = false,
  onEdit,
}: ConnectorRecoveryProps) {
  const t = useTranslations('knowledge.connectors.recovery')
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const connectorDef = CONNECTOR_META_REGISTRY[connector.connectorType]
  const serviceId = connectorDef?.auth.mode === 'oauth' ? connectorDef.auth.provider : undefined
  const providerId = serviceId ? getProviderIdFromServiceId(serviceId) : undefined
  const requiredScopes = connectorDef
    ? getConnectorRequiredScopes(connectorDef.auth, connector.sourceConfig)
    : []
  const {
    data: credentials,
    isFetching: credentialsLoading,
    refetch: refetchCredentials,
  } = useOAuthCredentials(providerId, resourceScopeFields(scope))
  const selectedCredential = credentials?.find((item) => item.id === connector.credentialId)
  const requiresAccountSettings =
    (connectorDef &&
      !isConnectorCredentialTypeAllowed(connectorDef.auth, connector.accessMode, 'oauth')) ||
    selectedCredential?.type === 'service_account' ||
    Boolean(connector.credentialId && !selectedCredential && !credentialsLoading)
  const missingScopes = selectedCredential
    ? getMissingRequiredScopes(selectedCredential, requiredScopes)
    : []

  useCredentialRefreshTriggers(
    refetchCredentials,
    selectedCredential?.provider ?? providerId ?? '',
    scope
  )

  useEffect(() => {
    if (showOAuthModal && requiresAccountSettings) {
      setShowOAuthModal(false)
    }
  }, [showOAuthModal, requiresAccountSettings])

  function openReconnect() {
    if (!canEdit || disabled || requiresAccountSettings) return
    if (connector.credentialId && !selectedCredential) return
    setShowOAuthModal(true)
  }

  function onOAuthOpenChange(open: boolean) {
    if (!open) {
      setShowOAuthModal(false)
    }
  }

  const docsUrl = isSearchIndex ? connectorDef?.searchDocsUrl : undefined
  const credentialRemoved =
    connector.lastSyncError === CREDENTIAL_REMOVED_SYNC_ERROR && !connector.credentialId
  const credentialRevoked =
    connector.lastSyncError === CREDENTIAL_REVOKED_SYNC_ERROR && Boolean(connector.credentialId)
  const reconnectRequired = credentialRemoved || credentialRevoked
  const pausedTitle = reconnectRequired ? t('reconnectToResume') : t('pausedAfterFailures')

  return (
    <>
      {connector.accessMode === 'members' && connector.memberSyncStatus === 'disabled' && (
        <SettingsResourceRow
          title={t('memberSyncDisabled')}
          description={connector.lastMemberSyncError ?? t('memberSyncDisabledDescription')}
        />
      )}
      {connector.status === 'disabled' || reconnectRequired ? (
        <SettingsResourceRow
          title={
            !canEdit
              ? pausedTitle
              : requiresAccountSettings
                ? t('updateSourceAccount')
                : serviceId
                  ? t('reconnectToResume')
                  : pausedTitle
          }
          trailing={
            canEdit && requiresAccountSettings && onEdit ? (
              <Chip disabled={disabled} onClick={onEdit}>
                {t('settings')}
              </Chip>
            ) : canEdit && !requiresAccountSettings && serviceId && providerId ? (
              <Chip
                disabled={disabled || Boolean(connector.credentialId && !selectedCredential)}
                onClick={openReconnect}
              >
                {t('reconnect')}
              </Chip>
            ) : undefined
          }
        />
      ) : missingScopes.length > 0 ? (
        <SettingsResourceRow
          title={t('additionalPermissions')}
          trailing={
            canEdit ? (
              <Chip disabled={disabled} onClick={openReconnect}>
                {t('updateAccess')}
              </Chip>
            ) : undefined
          }
        />
      ) : null}
      {showOAuthModal &&
        !requiresAccountSettings &&
        canEdit &&
        serviceId &&
        providerId &&
        !connector.credentialId && (
          <ConnectOAuthModal
            mode='connect'
            origin='kb-connectors'
            open
            onOpenChange={onOAuthOpenChange}
            serviceId={serviceId}
            providerId={providerId}
            docsUrl={docsUrl}
            requiredScopes={getCanonicalScopesForProvider(providerId)}
            {...resourceScopeFields(scope)}
            knowledgeBaseId={knowledgeBaseId}
            connectorId={connector.id}
            connectorType={connector.connectorType}
          />
        )}
      {showOAuthModal &&
        !requiresAccountSettings &&
        canEdit &&
        serviceId &&
        providerId &&
        selectedCredential && (
          <ConnectOAuthModal
            mode='reauthorize'
            open
            onOpenChange={onOAuthOpenChange}
            toolName={connectorDef?.name ?? connector.connectorType}
            requiredScopes={getCanonicalScopesForProvider(providerId)}
            newScopes={missingScopes}
            serviceId={serviceId}
            providerId={selectedCredential.provider}
            docsUrl={docsUrl}
            reconnectTarget={{
              ...resourceScopeFields(scope),
              credentialId: selectedCredential.id,
              displayName: selectedCredential.name,
            }}
            returnContext={{
              origin: 'kb-connectors',
              knowledgeBaseId,
              connectorId: connector.id,
              connectorType: connector.connectorType,
            }}
          />
        )}
    </>
  )
}
