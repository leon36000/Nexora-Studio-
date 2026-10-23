'use client'

import { Badge, Skeleton } from '@sim/emcn'
import { RefreshCw } from '@sim/emcn/icons'
import { useFormatter, useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import type { NexoraServiceState } from '@/lib/api/contracts/nexora-status'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsField } from '@/app/workspace/[workspaceId]/settings/components/settings-field'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useNexoraInstanceStatus } from '@/hooks/queries/nexora-status'

const STATE_BADGE = {
  up: 'green',
  down: 'red',
  'not-configured': 'gray',
} as const satisfies Record<NexoraServiceState, 'green' | 'red' | 'gray'>

/**
 * Réglages › État (Nexora edition, instance admins): the state of each platform service, the
 * installed version, the free disk space and where to find the last backup — the same facts as
 * `nexora status` on the server. Read-only; « Actualiser » checks again.
 */
export function NexoraStatus() {
  const t = useTranslations('settings.instanceStatus')
  const format = useFormatter()
  const { data, error, isLoading, isFetching, refetch } = useNexoraInstanceStatus()

  const actions = [
    {
      id: 'refresh',
      text: isFetching ? t('refreshing') : t('refresh'),
      icon: RefreshCw,
      disabled: isFetching,
      onSelect: () => void refetch(),
    },
  ]

  if (isLoading) {
    return (
      <SettingsPanel>
        <Skeleton className='h-[320px] w-full rounded-lg' />
      </SettingsPanel>
    )
  }
  if (!data) {
    const forbidden = isApiClientError(error) && (error.status === 401 || error.status === 403)
    return (
      <SettingsPanel actions={actions}>
        {forbidden ? (
          <SettingsEmptyState>{t('forbidden')}</SettingsEmptyState>
        ) : (
          <SettingsQueryErrorState
            error={error}
            fallback={t('loadError')}
            isRetrying={isFetching}
            onRetry={() => void refetch()}
          />
        )}
      </SettingsPanel>
    )
  }

  return (
    <SettingsPanel actions={actions}>
      <div className='flex flex-col gap-7'>
        <SettingsSection label={t('services.title')}>
          <div className={RESOURCE_LIST_STACK}>
            {data.services.map((service) => (
              <SettingsResourceRow
                key={service.id}
                title={t(`services.names.${service.id}`)}
                badge={
                  <Badge variant={STATE_BADGE[service.state]} size='sm' dot>
                    {t(`states.${service.state}`)}
                  </Badge>
                }
              />
            ))}
          </div>
          <p className='text-[var(--text-muted)] text-caption'>
            {t('checkedAt', {
              time: format.dateTime(new Date(data.checkedAt), { timeStyle: 'medium' }),
            })}
          </p>
        </SettingsSection>
        <SettingsSection label={t('server.title')}>
          <div className='flex flex-col gap-5'>
            <SettingsField label={t('server.version')}>
              {data.version ?? t('server.versionUnknown')}
            </SettingsField>
            <SettingsField label={t('server.diskFree')}>
              {data.diskFreeGb === null
                ? t('server.diskUnknown')
                : t('server.diskFreeValue', { gb: data.diskFreeGb })}
            </SettingsField>
            <SettingsField label={t('server.lastBackup')}>
              <p className='text-[var(--text-body)] text-sm'>
                {t.rich('server.lastBackupValue', {
                  command: (chunks) => <code className='font-mono'>{chunks}</code>,
                })}
              </p>
            </SettingsField>
          </div>
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
