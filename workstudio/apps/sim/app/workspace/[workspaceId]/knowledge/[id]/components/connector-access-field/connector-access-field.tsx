'use client'

import type { ReactNode } from 'react'
import {
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipCombobox,
  ChipDropdown,
  ChipLink,
  ChipModalField,
  type ComboboxOption,
  Tooltip,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { ConnectorAccessMode } from '@/lib/api/contracts/knowledge/connectors'
import { type ResourceScope, resourceScopeFromOwner } from '@/lib/core/resource-scope'
import { supportsConnectorAccessMode } from '@/lib/knowledge/connectors/access-modes'
import { slackSearchSetupHref } from '@/lib/sim-search/setup-navigation'
import { connectorMemberProvider } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connector-access-field/connector-access'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { isConnectorCredentialTypeAllowed } from '@/connectors/auth'
import type { ConnectorMeta } from '@/connectors/types'
import { useSourceAccounts } from '@/hooks/queries/source-accounts'

export interface ConnectorAccessSelection {
  accessMode: ConnectorAccessMode
}

interface ConnectorContentCredentialFieldProps {
  credentialId: string | null
  onChange: (credentialId: string | null) => void
  options: ComboboxOption[]
  isLoading: boolean
  disabled?: boolean
}

/** A dedicated source account supplies content; member accounts supply visibility only. */
export function ConnectorContentCredentialField({
  credentialId,
  onChange,
  options,
  isLoading,
  disabled,
}: ConnectorContentCredentialFieldProps) {
  const t = useTranslations('knowledge.connectorAccess')
  return (
    <ChipModalField type='custom' title={t('syncDocumentsWith')}>
      <ChipCombobox
        value={credentialId ?? '__connected_members__'}
        options={[{ value: '__connected_members__', label: t('connectedMembers') }, ...options]}
        onChange={(value) => onChange(value === '__connected_members__' ? null : value)}
        isLoading={isLoading}
        disabled={disabled}
        placeholder={t('chooseAccount')}
      />
    </ChipModalField>
  )
}

interface ConnectorAccessFieldProps {
  workspaceId?: string
  scope?: ResourceScope
  connectorConfig: ConnectorMeta
  value: ConnectorAccessSelection
  onChange: (value: ConnectorAccessSelection) => void
  /** Only an admin may move a connector out of workspace mode. */
  canAdmin: boolean
  disabled?: boolean
  /** Existing Search sources retain the sync method chosen during setup. */
  lockAccessMode?: boolean
  isAvailabilityReady?: boolean
  /** Whether member accounts may be chosen; an existing selection remains visible for recovery. */
  allowMembers?: boolean
  /** Whether administrator access may be chosen; it needs a connector that mirrors source permissions. */
  allowAdmin?: boolean
  allowWorkspace?: boolean
  /** Rendered under the selection, for a caller that applies the change with its own control. */
  footer?: ReactNode
  searchSetupSource?: 'slack'
  slackSetupOnly?: boolean
  onSetupNavigate?: () => void
}

/** Chooses how a source connects while preserving its document permissions. */
export function ConnectorAccessField({
  workspaceId,
  scope: explicitScope,
  connectorConfig,
  value,
  onChange,
  canAdmin,
  disabled = false,
  lockAccessMode = false,
  isAvailabilityReady = true,
  allowMembers = true,
  allowAdmin = false,
  allowWorkspace = true,
  footer,
  searchSetupSource,
  slackSetupOnly = false,
  onSetupNavigate,
}: ConnectorAccessFieldProps) {
  const t = useTranslations('knowledge.connectorAccess')
  const scope = explicitScope ?? resourceScopeFromOwner({ workspaceId })
  /**
   * Member access needs a supported sign-in provider. Source permissions may
   * also be available for providers authenticated with an API key.
   */
  const provider = connectorMemberProvider(connectorConfig)
  const membersSupported = provider !== null
  const accountsQuery = useSourceAccounts(
    canAdmin && provider && value.accessMode === 'members' ? scope : undefined
  )
  const accounts = accountsQuery.data?.credentialGroup
  const showSlackSetup =
    canAdmin && value.accessMode === 'members' && connectorConfig.id === 'slack'
  const configured =
    accounts?.status === 'active' &&
    accounts.options.some(
      (option) =>
        option.provider === provider &&
        option.status === 'active' &&
        option.configurationStatus === 'ready'
    )
  const adminSupported = Boolean(connectorConfig.mirrorsSourceAcls)
  if (!membersSupported && !adminSupported && value.accessMode === 'workspace') return null

  const modes: { mode: ConnectorAccessMode; label: string; allowed: boolean }[] = [
    { mode: 'workspace', label: t('modes.workspace'), allowed: allowWorkspace },
    { mode: 'members', label: t('modes.members'), allowed: membersSupported && allowMembers },
    {
      mode: 'admin',
      label:
        !lockAccessMode && isConnectorCredentialTypeAllowed(connectorConfig.auth, 'admin', 'oauth')
          ? t('modes.adminOrService')
          : t('modes.service'),
      allowed: adminSupported && allowAdmin,
    },
  ]
  for (const entry of modes)
    entry.allowed &&= supportsConnectorAccessMode(connectorConfig, entry.mode)
  if (
    connectorConfig.supportedAccessModes?.filter((mode) => allowWorkspace || mode !== 'workspace')
      .length === 1 &&
    modes.some((entry) => entry.mode === value.accessMode && entry.allowed)
  )
    return canAdmin && footer ? <div className='px-2'>{footer}</div> : null
  /** Keep a retired current method visible so an admin can select an available replacement. */
  const visibleModes = modes.filter((entry) => entry.allowed || entry.mode === value.accessMode)
  const currentMode = modes.find((entry) => entry.mode === value.accessMode)
  const showModeSelector =
    canAdmin && visibleModes.some((entry) => entry.allowed && entry.mode !== value.accessMode)

  if (!canAdmin && value.accessMode === 'workspace') return null

  return (
    <ChipModalField
      type='custom'
      title={
        slackSetupOnly ? t('slackApp') : allowWorkspace ? t('connectionMethod') : t('syncUsing')
      }
      error={canAdmin && !showSlackSetup ? accountsQuery.error?.message : undefined}
      hint={
        canAdmin && isAvailabilityReady && !currentMode?.allowed
          ? t('methodUnavailable', { kind: scope.kind })
          : value.accessMode === 'workspace'
            ? t('workspaceHint')
            : undefined
      }
    >
      <div className='flex flex-col gap-2'>
        {slackSetupOnly ? null : lockAccessMode ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild tabIndex={0}>
              <span className='inline-flex w-fit cursor-not-allowed'>
                <ChipDropdown
                  aria-label={t('syncUsingLabel', { mode: currentMode?.label ?? t('unavailable') })}
                  value={value.accessMode}
                  options={visibleModes.map(({ mode, label }) => ({ value: mode, label }))}
                  disabled
                  className='pointer-events-none w-fit'
                />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('lockedTooltip')}</Tooltip.Content>
          </Tooltip.Root>
        ) : showModeSelector ? (
          <ChipButtonGroup
            value={value.accessMode}
            disabled={disabled}
            onValueChange={(mode) => {
              const selection = modes.find((entry) => entry.mode === mode && entry.allowed)
              if (!disabled && selection) onChange({ accessMode: selection.mode })
            }}
          >
            {visibleModes.map((entry) => (
              <ChipButtonGroupItem key={entry.mode} value={entry.mode} disabled={!entry.allowed}>
                {entry.label}
              </ChipButtonGroupItem>
            ))}
          </ChipButtonGroup>
        ) : (
          <p className='text-[var(--text-body)] text-small'>
            {modes.find((entry) => entry.mode === value.accessMode)?.label}
          </p>
        )}

        {showSlackSetup &&
          (accountsQuery.isError ? (
            <SettingsQueryErrorState
              error={accountsQuery.error}
              fallback={t('slackCheckFailed')}
              isRetrying={accountsQuery.isFetching}
              onRetry={() => void accountsQuery.refetch()}
              variant='inline'
            />
          ) : accountsQuery.isPending ? (
            <SettingsEmptyState variant='inline'>{t('checkingSlack')}</SettingsEmptyState>
          ) : accountsQuery.isSuccess && !configured ? (
            <SlackMemberSetup
              scope={scope}
              searchSetupSource={searchSetupSource}
              onNavigate={onSetupNavigate}
            />
          ) : null)}

        {canAdmin && footer}
      </div>
    </ChipModalField>
  )
}

interface SlackMemberSetupProps {
  workspaceId?: string
  scope?: ResourceScope
  searchSetupSource?: 'slack' | 'search'
  onNavigate?: () => void
}

/** Uses the existing app and credential-group setup to collect Slack user authorization. */
export function SlackMemberSetup({
  workspaceId,
  scope: explicitScope,
  searchSetupSource,
  onNavigate,
}: SlackMemberSetupProps) {
  const t = useTranslations('knowledge.connectorAccess')
  const scope = explicitScope ?? resourceScopeFromOwner({ workspaceId })
  const href =
    scope.kind === 'organization'
      ? slackSearchSetupHref(scope.organizationId, searchSetupSource ?? 'search')
      : `/workspace/${scope.workspaceId}/settings/credential-groups`
  return (
    <ChipLink href={href} onClick={onNavigate}>
      {t('setUpSlack')}
    </ChipLink>
  )
}
