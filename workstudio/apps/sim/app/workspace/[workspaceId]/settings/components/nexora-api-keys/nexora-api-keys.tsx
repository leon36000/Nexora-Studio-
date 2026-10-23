'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, ChipLink } from '@sim/emcn'
import { Code, Plus } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useFormatter, useTranslations } from 'next-intl'
import type { NexoraApiKey } from '@/lib/api/contracts/nexora-api-keys'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { CreateNexoraApiKeyModal } from '@/app/workspace/[workspaceId]/settings/components/nexora-api-keys/create-nexora-api-key-modal'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  useInstanceNexoraApiKeys,
  useRevokeInstanceNexoraApiKey,
  useRevokeWorkspaceNexoraApiKey,
  useWorkspaceNexoraApiKeys,
} from '@/hooks/queries/nexora-api-keys'

const EMPTY_KEYS: NexoraApiKey[] = []

interface NexoraApiKeysSectionProps {
  workspaceId: string
}

interface KeyRowProps {
  apiKey: NexoraApiKey
  canRevoke: boolean
  onRevoke: (key: NexoraApiKey) => void
}

function KeyRow({ apiKey, canRevoke, onRevoke }: KeyRowProps) {
  const t = useTranslations('developers.keys')
  const format = useFormatter()
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' })
  const integer = (value: number) => format.number(value)
  const details = [
    `sk-nexora-…${apiKey.keySuffix}`,
    apiKey.allowedModels === null ? t('allModels') : apiKey.allowedModels.join(', '),
    ...(apiKey.scope === 'workspace' && apiKey.allowAgents ? [t('agents')] : []),
    t('rpm', { rpm: apiKey.requestsPerMinute }),
    apiKey.expiresAt ? t('expires', { date: date(apiKey.expiresAt) }) : t('noExpiry'),
  ]
  const usage =
    apiKey.monthlyTokenCap === null
      ? t('usage', {
          tokens: integer(apiKey.usage.totalTokens),
          requests: integer(apiKey.usage.requests),
        })
      : t('usageCapped', {
          tokens: integer(apiKey.usage.totalTokens),
          cap: integer(apiKey.monthlyTokenCap),
          requests: integer(apiKey.usage.requests),
        })

  return (
    <SettingsResourceRow
      title={
        <span className='flex items-center gap-2'>
          {apiKey.name}
          {apiKey.status !== 'active' && (
            <span className='text-[var(--text-error)] text-caption'>
              {t(`status.${apiKey.status}`)}
            </span>
          )}
        </span>
      }
      description={`${details.join(' · ')} — ${usage}`}
      badge={
        <span className='whitespace-nowrap text-[var(--text-muted)] text-caption'>
          {apiKey.lastUsedAt ? t('lastUsed', { date: date(apiKey.lastUsedAt) }) : t('neverUsed')}
        </span>
      }
      trailing={
        apiKey.status === 'revoked' ? undefined : (
          <RowActionsMenu
            label={t('rowActions')}
            actions={[
              {
                label: t('revoke'),
                destructive: true,
                disabled: !canRevoke,
                onSelect: () => onRevoke(apiKey),
              },
            ]}
          />
        )
      }
    />
  )
}

/**
 * Réglages › Clés API: the developer API keys (OpenAI format) of the workspace, and of the
 * instance for its administrators, with their limits and this month's use.
 */
export function NexoraApiKeysSection({ workspaceId }: NexoraApiKeysSectionProps) {
  const t = useTranslations('developers.keys')
  const { canEdit } = useUserPermissionsContext()
  const workspaceKeys = useWorkspaceNexoraApiKeys(workspaceId)
  const instanceKeys = useInstanceNexoraApiKeys()
  const revokeWorkspaceKey = useRevokeWorkspaceNexoraApiKey()
  const revokeInstanceKey = useRevokeInstanceNexoraApiKey()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<NexoraApiKey | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const isInstanceAdmin = Boolean(instanceKeys.data)
  const keys = workspaceKeys.data?.keys ?? EMPTY_KEYS
  const instance = instanceKeys.data?.keys ?? EMPTY_KEYS
  const canCreate = canEdit || isInstanceAdmin

  const handleRevoke = async () => {
    if (!revoking) return
    setRevokeError(null)
    try {
      if (revoking.scope === 'instance') {
        await revokeInstanceKey.mutateAsync({ keyId: revoking.id })
      } else {
        await revokeWorkspaceKey.mutateAsync({ workspaceId, keyId: revoking.id })
      }
      setRevoking(null)
    } catch (error) {
      setRevokeError(getErrorMessage(error, t('revokeFailed')))
    }
  }

  const sectionAction = (
    <div className='flex items-center gap-1'>
      <ChipLink href={`/workspace/${workspaceId}/developpeurs`} leftIcon={Code}>
        {t('developers')}
      </ChipLink>
      {canCreate && (
        <Chip leftIcon={Plus} onClick={() => setIsCreateOpen(true)}>
          {t('newKey')}
        </Chip>
      )}
    </div>
  )

  return (
    <>
      <SettingsSection label={t('title')} action={sectionAction}>
        {workspaceKeys.error && !workspaceKeys.data ? (
          <SettingsEmptyState variant='inline'>
            {getErrorMessage(workspaceKeys.error, t('loadFailed'))}
          </SettingsEmptyState>
        ) : workspaceKeys.isLoading ? null : keys.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>
        ) : (
          <div className={RESOURCE_LIST_STACK}>
            {keys.map((key) => (
              <KeyRow key={key.id} apiKey={key} canRevoke={canEdit} onRevoke={setRevoking} />
            ))}
          </div>
        )}
      </SettingsSection>

      {isInstanceAdmin && (
        <SettingsSection label={t('instanceTitle')}>
          {instance.length === 0 ? (
            <SettingsEmptyState variant='inline'>{t('instanceEmpty')}</SettingsEmptyState>
          ) : (
            <div className={RESOURCE_LIST_STACK}>
              {instance.map((key) => (
                <KeyRow key={key.id} apiKey={key} canRevoke onRevoke={setRevoking} />
              ))}
            </div>
          )}
        </SettingsSection>
      )}

      <CreateNexoraApiKeyModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={workspaceId}
        canCreateWorkspaceKeys={canEdit}
        canCreateInstanceKeys={isInstanceAdmin}
      />

      <ChipConfirmModal
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevoking(null)
            setRevokeError(null)
          }
        }}
        srTitle={t('revokeDialog.title')}
        title={t('revokeDialog.title')}
        text={[
          t('revokeDialog.before'),
          { text: revoking?.name ?? '', bold: true },
          ' ',
          { text: t('revokeDialog.consequence'), error: true },
          ...(revokeError ? [' ', { text: revokeError, error: true }] : []),
        ]}
        confirm={{
          label: t('revoke'),
          onClick: handleRevoke,
          pending: revokeWorkspaceKey.isPending || revokeInstanceKey.isPending,
          pendingLabel: t('revoking'),
        }}
      />
    </>
  )
}
