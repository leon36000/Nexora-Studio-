'use client'

import { useMemo, useState } from 'react'
import {
  Chip,
  ChipCombobox,
  ChipModalError,
  ChipModalField,
  ChipSelect,
  type ComboboxOption,
} from '@sim/emcn'
import { ChevronDown, ChevronRight, Plus } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { ConnectorAccessMode } from '@/lib/api/contracts/knowledge/connectors'
import { type ResourceScope, resourceScopeFields } from '@/lib/core/resource-scope'
import { asServiceAccountProviderId } from '@/lib/credentials/service-account-provider-ids'
import {
  getProviderIdFromServiceId,
  getServiceAccountProviderForProviderId,
  type OAuthProvider,
} from '@/lib/oauth'
import { GITHUB_INSTALLATION_PROVIDER_ID } from '@/lib/oauth/github-installation-types'
import { liveSearchSourceMeta } from '@/lib/sim-search/live/source-settings'
import type { SourceSelectionLabel, SourceSelectionLabels } from '@/lib/sim-search/source-identity'
import {
  ConnectServiceAccountModal,
  useServiceAccountConnectTarget,
} from '@/app/workspace/[workspaceId]/integrations/components/connect-service-account-modal'
import {
  derivedAclCapFieldIds,
  isConnectorFieldRequired,
} from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connector-access-field/connector-access'
import {
  ConnectorAccessField,
  type ConnectorAccessSelection,
  ConnectorContentCredentialField,
} from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connector-access-field/connector-access-field'
import { ConnectorConfigFields } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connector-config-fields'
import {
  connectorSyncFrequencyHint,
  SYNC_INTERVALS,
} from '@/app/workspace/[workspaceId]/knowledge/[id]/components/consts'
import type {
  ConfigFieldMap,
  ConfigFieldValue,
} from '@/app/workspace/[workspaceId]/knowledge/[id]/hooks/use-connector-config-fields'
import { SettingsQueryErrorState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { isConnectorCredentialTypeAllowed } from '@/connectors/auth'
import { GitHubInstallationConnectionField } from '@/connectors/github/installation-connection-field'
import {
  GitLabPermissionTabs,
  GitLabPermissionUploads,
} from '@/connectors/gitlab/permission-config/fields'
import type { GitLabPermissionForm } from '@/connectors/gitlab/permission-config/use-permission-form'
import type { ConnectorConfigField, ConnectorMeta } from '@/connectors/types'
import { useOAuthCredentials } from '@/hooks/queries/oauth/credentials'
import { useCredentialRefreshTriggers } from '@/hooks/use-credential-refresh-triggers'
import { useGitHubInstallationSetup } from '@/hooks/use-github-installation-setup'

/** Message keys (`knowledge.connectorSettings.switchNotice`) explaining a connection-method switch. */
const SWITCH_NOTICE_KEYS: Record<ConnectorAccessMode, ConnectorAccessMode> = {
  workspace: 'workspace',
  members: 'members',
  admin: 'admin',
}

export interface ConnectorSettingsFieldsProps {
  gitlabPermissions?: GitLabPermissionForm
  availability: {
    error: Error | null
    isFetching: boolean
    isReady: boolean
    refetch: () => unknown
  }
  isSearchIndex: boolean
  usesGitHubInstallation?: boolean
  connectorConfig: ConnectorMeta | null
  selectionLabels: SourceSelectionLabels
  sourceConfig: ConfigFieldMap
  credentialId: string | null
  canonicalGroups: Map<string, ConnectorConfigField[]>
  canonicalModes: Record<string, 'basic' | 'advanced'>
  onToggleCanonicalMode: (canonicalId: string) => void
  onFieldChange: (
    fieldId: string,
    value: ConfigFieldValue,
    selectedOptions?: SourceSelectionLabel[]
  ) => void
  isFieldVisible: (field: ConnectorConfigField) => boolean
  syncInterval: number
  setSyncInterval: (v: number) => void
  hasMaxAccess: boolean
  isSaving: boolean
  error: string | null
  saveBlockedReason?: string
  access: ConnectorAccessSelection
  onAccessChange: (access: ConnectorAccessSelection) => void
  canAdmin: boolean
  showAccessField: boolean
  allowMembers: boolean
  allowAdmin: boolean
  allowWorkspace: boolean
  canReenableMemberSync: boolean
  accessDirty: boolean
  accessModeChanged: boolean
  accessComplete: boolean
  accessSetupHint?: string
  isSwitchingAccess: boolean
  onApplyAccess: () => void
  onResetAccess: () => void
  scope: ResourceScope
  needsWorkspaceCredential: boolean
  workspaceCredentialId: string | null
  contentCredentialId: string | null
  onContentCredentialChange: (credentialId: string | null) => void
  onWorkspaceCredentialChange: (credentialId: string) => void
}

export function ConnectorSettingsFields({
  gitlabPermissions,
  availability,
  isSearchIndex,
  usesGitHubInstallation = false,
  connectorConfig: originalConfig,
  sourceConfig,
  selectionLabels,
  credentialId,
  canonicalGroups,
  canonicalModes,
  onToggleCanonicalMode,
  onFieldChange,
  isFieldVisible,
  syncInterval,
  setSyncInterval,
  hasMaxAccess,
  isSaving,
  error,
  saveBlockedReason,
  access,
  onAccessChange,
  canAdmin,
  showAccessField,
  allowMembers,
  allowAdmin,
  allowWorkspace,
  canReenableMemberSync,
  accessDirty,
  accessModeChanged,
  accessComplete,
  accessSetupHint,
  isSwitchingAccess,
  onApplyAccess,
  onResetAccess,
  scope,
  needsWorkspaceCredential,
  workspaceCredentialId,
  contentCredentialId,
  onContentCredentialChange,
  onWorkspaceCredentialChange,
}: ConnectorSettingsFieldsProps) {
  const t = useTranslations('knowledge.connectorSettings')
  const tAdd = useTranslations('knowledge.addConnector')
  const tSync = useTranslations('knowledge.syncFrequency')
  const liveSearch = isSearchIndex
  const connectorConfig = liveSearchSourceMeta(originalConfig, Boolean(liveSearch), {
    githubInstallation: usesGitHubInstallation && scope.kind === 'organization',
  })
  const providerId =
    connectorConfig?.auth.mode === 'oauth'
      ? (getProviderIdFromServiceId(connectorConfig.auth.provider) as OAuthProvider)
      : null
  const syncsPerMember = access.accessMode === 'members'
  const isGitHubInstallationSource =
    usesGitHubInstallation &&
    isSearchIndex &&
    scope.kind === 'organization' &&
    connectorConfig?.id === 'github' &&
    syncsPerMember
  const requiresServiceAccount = Boolean(
    connectorConfig &&
      !isConnectorCredentialTypeAllowed(connectorConfig.auth, access.accessMode, 'oauth')
  )
  const serviceAccountProviderId = providerId
    ? getServiceAccountProviderForProviderId(providerId)
    : undefined
  const serviceAccountTarget = useServiceAccountConnectTarget({
    serviceAccountProviderId:
      isSearchIndex || requiresServiceAccount
        ? asServiceAccountProviderId(serviceAccountProviderId)
        : undefined,
    serviceName: connectorConfig?.name,
    serviceIcon: connectorConfig?.icon,
  })
  const [showServiceAccountModal, setShowServiceAccountModal] = useState(false)
  const githubSetup = useGitHubInstallationSetup({
    organizationId:
      isGitHubInstallationSource && canAdmin && scope.kind === 'organization'
        ? scope.organizationId
        : undefined,
    onConnected: onContentCredentialChange,
  })
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const isContentCredentialChange = accessDirty && !accessModeChanged
  const {
    data: rawCredentials = [],
    isLoading: credentialsLoading,
    isFetching: credentialsFetching,
    error: credentialsError,
    refetch: refetchCredentials,
  } = useOAuthCredentials(providerId ?? undefined, {
    enabled: (needsWorkspaceCredential || syncsPerMember) && Boolean(providerId),
    purpose: syncsPerMember ? 'browsing' : undefined,
    ...resourceScopeFields(scope),
  })
  useCredentialRefreshTriggers(refetchCredentials, providerId ?? '', scope)
  const [browseCredentialId, setBrowseCredentialId] = useState<string | null>(null)
  const selectorCredentialId = isGitHubInstallationSource
    ? contentCredentialId
    : syncsPerMember
      ? browseCredentialId
      : (workspaceCredentialId ?? credentialId)
  const selectorCredential = rawCredentials.find((item) => item.id === selectorCredentialId)
  const installations = rawCredentials.filter(
    (credential) => credential.provider === GITHUB_INSTALLATION_PROVIDER_ID
  )
  const credentialOptions = useMemo<ComboboxOption[]>(
    () =>
      rawCredentials
        .filter(
          (credential) =>
            !connectorConfig ||
            isConnectorCredentialTypeAllowed(
              connectorConfig.auth,
              access.accessMode,
              credential.type
            )
        )
        .map((credential) => ({
          label: credential.name || credential.provider,
          value: credential.id,
        })),
    [rawCredentials, connectorConfig, access.accessMode]
  )

  const hideFixedAccessMode = isSearchIndex && needsWorkspaceCredential && canAdmin && allowAdmin
  const hiddenCapFieldIds = derivedAclCapFieldIds(connectorConfig, access.accessMode)
  const isOptionalSetupField = (field: ConnectorConfigField) =>
    Boolean(gitlabPermissions && connectorConfig) &&
    field.setupGroup === 'options' &&
    !isConnectorFieldRequired(field, connectorConfig!, access.accessMode)
  const configFieldsProps = connectorConfig
    ? {
        scope,
        accessMode: access.accessMode,
        connectorConfig,
        sourceConfig,
        selectionLabels,
        credentialId: selectorCredential?.id ?? null,
        credentialType: selectorCredential?.type,
        canonicalGroups,
        canonicalModes,
        onFieldChange,
        onToggleCanonicalMode,
        disabled: isSaving,
      }
    : null

  return (
    <>
      {gitlabPermissions && (
        <>
          <GitLabPermissionTabs form={gitlabPermissions} disabled={isSaving || !canAdmin} />
          <ChipModalField
            type='input'
            title={t('personalAccessToken')}
            value={gitlabPermissions.apiKey}
            onChange={gitlabPermissions.setApiKey}
            inputType='password'
            placeholder={t('keepSavedToken')}
            disabled={isSaving || !canAdmin}
          />
        </>
      )}
      {availability.error && (
        <ChipModalField type='custom' title={tAdd('connectionAvailability')}>
          <SettingsQueryErrorState
            error={availability.error}
            isRetrying={availability.isFetching}
            fallback={tAdd('loadAvailabilityFailed')}
            onRetry={() => void availability.refetch()}
            variant='inline'
          />
        </ChipModalField>
      )}
      {isGitHubInstallationSource && (
        <GitHubInstallationConnectionField
          installations={installations}
          credentialId={contentCredentialId}
          isLoading={credentialsLoading}
          isFetching={credentialsFetching}
          error={credentialsError}
          disabled={isSaving || !canAdmin}
          onRetry={() => void refetchCredentials()}
          onConnect={() => void githubSetup.connect(installations.length ? 'install' : undefined)}
          connecting={githubSetup.pending}
          connectionError={githubSetup.error}
          hint={accessDirty ? t('keepsRepository') : undefined}
          onCancel={githubSetup.cancel}
          onCheckConnection={() => void githubSetup.checkConnection()}
          isChecking={githubSetup.isChecking}
          onChange={onContentCredentialChange}
        >
          {(accessDirty || canReenableMemberSync) && (
            <div className='flex items-center gap-2'>
              <Chip
                variant='primary'
                onClick={onApplyAccess}
                disabled={!accessComplete || !contentCredentialId || isSaving || !canAdmin}
              >
                {isSwitchingAccess
                  ? t('updating')
                  : canReenableMemberSync
                    ? t('reenableSync')
                    : t('changeConnection')}
              </Chip>
              {accessDirty && (
                <Chip onClick={onResetAccess} disabled={isSaving}>
                  {t('cancel')}
                </Chip>
              )}
            </div>
          )}
        </GitHubInstallationConnectionField>
      )}
      {!isGitHubInstallationSource &&
        syncsPerMember &&
        connectorConfig?.supportsSeparateContentCredential && (
          <ConnectorContentCredentialField
            credentialId={contentCredentialId}
            onChange={onContentCredentialChange}
            options={credentialOptions}
            isLoading={credentialsLoading}
            disabled={isSaving || !canAdmin}
          />
        )}
      {connectorConfig &&
        showAccessField &&
        !isGitHubInstallationSource &&
        !hideFixedAccessMode && (
          <ConnectorAccessField
            scope={scope}
            connectorConfig={connectorConfig}
            value={access}
            onChange={onAccessChange}
            canAdmin={canAdmin}
            lockAccessMode={isSearchIndex}
            isAvailabilityReady={availability.isReady}
            allowMembers={allowMembers}
            allowAdmin={allowAdmin}
            allowWorkspace={allowWorkspace}
            disabled={isSaving}
            footer={
              canReenableMemberSync ? (
                <div className='flex flex-col gap-2'>
                  <div>
                    <Chip
                      variant='primary'
                      onClick={onApplyAccess}
                      disabled={!accessComplete || isSaving}
                    >
                      {isSwitchingAccess ? t('reenabling') : t('reenableMemberSync')}
                    </Chip>
                  </div>
                  <p className='text-[var(--text-muted)] text-caption leading-snug'>
                    {t('membersKept')}
                  </p>
                </div>
              ) : accessDirty && (!isContentCredentialChange || syncsPerMember) ? (
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center gap-2'>
                    <Chip
                      variant='primary'
                      onClick={onApplyAccess}
                      disabled={!accessComplete || isSaving}
                    >
                      {isSwitchingAccess
                        ? t('switching')
                        : isContentCredentialChange
                          ? t('changeIndexingAccount')
                          : t('applyConnectionMethod')}
                    </Chip>
                    <Chip onClick={onResetAccess} disabled={isSaving}>
                      {accessSetupHint ? t('editSettings') : t('cancel')}
                    </Chip>
                  </div>
                  <p className='text-[var(--text-muted)] text-caption leading-snug'>
                    {accessSetupHint ??
                      (isContentCredentialChange
                        ? t('nextSyncUsesAccount')
                        : t(`switchNotice.${SWITCH_NOTICE_KEYS[access.accessMode]}`))}
                  </p>
                </div>
              ) : undefined
            }
          />
        )}

      {connectorConfig && needsWorkspaceCredential && canAdmin && (
        <ChipModalField
          type='custom'
          title={
            isSearchIndex
              ? requiresServiceAccount
                ? tAdd('serviceAccount')
                : tAdd('account')
              : t('indexingAccount')
          }
          hint={
            !requiresServiceAccount && !credentialsLoading && credentialOptions.length === 0
              ? t('connectInIntegrations', { name: connectorConfig.name })
              : undefined
          }
        >
          <ChipCombobox
            options={[
              ...credentialOptions,
              ...(serviceAccountTarget && !serviceAccountTarget.hidden && allowAdmin
                ? [
                    {
                      label: serviceAccountTarget.label,
                      value: '__service_account__',
                      icon: Plus,
                      onSelect: () => setShowServiceAccountModal(true),
                    },
                  ]
                : []),
            ]}
            value={workspaceCredentialId ?? credentialId ?? undefined}
            onChange={onWorkspaceCredentialChange}
            placeholder={t('selectSyncAccount')}
            isLoading={credentialsLoading}
            disabled={isSaving}
          />
        </ChipModalField>
      )}

      {showServiceAccountModal && serviceAccountTarget && canAdmin && (
        <ConnectServiceAccountModal
          atlassianProduct={connectorConfig?.id === 'confluence' ? 'confluence' : undefined}
          atlassianSetupGuideUrl={
            isSearchIndex && connectorConfig?.id === 'confluence' && connectorConfig.searchDocsUrl
              ? `${connectorConfig.searchDocsUrl}#using-a-service-account`
              : undefined
          }
          open
          onOpenChange={setShowServiceAccountModal}
          {...resourceScopeFields(scope)}
          serviceAccountProviderId={serviceAccountTarget.serviceAccountProviderId}
          serviceName={serviceAccountTarget.serviceName}
          serviceIcon={serviceAccountTarget.serviceIcon}
          onCreated={onWorkspaceCredentialChange}
        />
      )}

      {connectorConfig &&
        !isGitHubInstallationSource &&
        syncsPerMember &&
        connectorConfig.configFields.some(
          (field) => field.type === 'selector' && isFieldVisible(field)
        ) && (
          <ChipModalField
            type='custom'
            title={tAdd('browsingAccount')}
            hint={isSearchIndex ? t('membersOwnAccounts') : undefined}
          >
            <ChipCombobox
              options={rawCredentials.map((credential) => ({
                label: credential.name || credential.provider,
                value: credential.id,
              }))}
              value={browseCredentialId ?? undefined}
              onChange={setBrowseCredentialId}
              placeholder={t('selectYourAccount', { name: connectorConfig.name })}
              isLoading={credentialsLoading}
              disabled={isSaving}
            />
          </ChipModalField>
        )}

      {configFieldsProps && (
        <ConnectorConfigFields
          {...configFieldsProps}
          isFieldVisible={(field) =>
            isFieldVisible(field) &&
            !hiddenCapFieldIds.has(field.id) &&
            !isOptionalSetupField(field)
          }
        />
      )}

      {gitlabPermissions && (
        <GitLabPermissionUploads form={gitlabPermissions} disabled={isSaving || !canAdmin} />
      )}

      {gitlabPermissions && (
        <>
          <div className='px-2'>
            <Chip
              type='button'
              leftIcon={showMoreOptions ? ChevronDown : ChevronRight}
              aria-expanded={showMoreOptions}
              onClick={() => setShowMoreOptions((visible) => !visible)}
            >
              {tAdd('moreOptions')}
            </Chip>
          </div>
          {showMoreOptions && configFieldsProps && (
            <ConnectorConfigFields
              {...configFieldsProps}
              isFieldVisible={(field) =>
                isFieldVisible(field) &&
                !hiddenCapFieldIds.has(field.id) &&
                isOptionalSetupField(field)
              }
            />
          )}
        </>
      )}

      {!isSearchIndex && (!gitlabPermissions || showMoreOptions) && (
        <ChipModalField
          type='custom'
          title={tSync('title')}
          hint={(() => {
            const hintKey =
              gitlabPermissions?.mode === 'csv'
                ? undefined
                : connectorSyncFrequencyHint(
                    access.accessMode,
                    syncInterval,
                    Boolean(contentCredentialId)
                  )
            return hintKey ? tSync(`hints.${hintKey}`) : undefined
          })()}
        >
          <ChipSelect
            fullWidth
            dropdownWidth='trigger'
            aria-label={tSync('ariaLabel')}
            value={String(syncInterval)}
            onChange={(value) => setSyncInterval(Number(value))}
            options={SYNC_INTERVALS.map((interval) => ({
              value: String(interval.value),
              label:
                interval.requiresMax && !hasMaxAccess
                  ? tSync('maxOnly', { label: tSync(`intervals.${interval.labelKey}`) })
                  : tSync(`intervals.${interval.labelKey}`),
              disabled: interval.requiresMax && !hasMaxAccess,
            }))}
          />
        </ChipModalField>
      )}

      <p role='status' className='sr-only'>
        {saveBlockedReason}
      </p>
      <ChipModalError>{error}</ChipModalError>
    </>
  )
}
