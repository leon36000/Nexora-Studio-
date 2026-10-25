'use client'

import { Badge, Label, Skeleton, Switch, toast } from '@sim/emcn'
import { useFormatter, useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsField } from '@/app/workspace/[workspaceId]/settings/components/settings-field'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  useNexoraCodeExecution,
  useUpdateNexoraCodeExecution,
} from '@/hooks/queries/nexora-code-execution'

/**
 * Réglages › Exécution de code (Nexora edition, instance admins): the switch that lets agents and
 * Function blocks run AI-written Python in the sandbox service, and the limits of each run. Off by
 * default; the switch is unavailable until the service is installed (`nexora code on`).
 */
export function NexoraCodeExecution() {
  const t = useTranslations('settings.codeExecution')
  const format = useFormatter()
  const { data, error, isLoading, isFetching, refetch } = useNexoraCodeExecution()
  const update = useUpdateNexoraCodeExecution()

  if (isLoading) {
    return (
      <SettingsPanel>
        <Skeleton className='h-[240px] w-full rounded-lg' />
      </SettingsPanel>
    )
  }
  if (!data) {
    const forbidden = isApiClientError(error) && (error.status === 401 || error.status === 403)
    return (
      <SettingsPanel>
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

  const onToggle = (enabled: boolean) =>
    update.mutate(enabled, {
      onError: (failure) =>
        toast.error(
          isApiClientError(failure) && failure.message === 'not-installed'
            ? t('notInstalledError')
            : t('saveError')
        ),
    })

  const limits = data.limits
  const rows: Array<{ id: string; label: string; value: string }> = limits
    ? [
        {
          id: 'cpus',
          label: t('limits.cpus'),
          value: t('limits.values.cpus', { count: limits.cpus }),
        },
        {
          id: 'memory',
          label: t('limits.memory'),
          value: t('limits.values.memory', { count: limits.memoryMb }),
        },
        {
          id: 'tmpfs',
          label: t('limits.tmpfs'),
          value: t('limits.values.tmpfs', { count: limits.tmpfsMb }),
        },
        {
          id: 'pids',
          label: t('limits.pids'),
          value: t('limits.values.pids', { count: limits.pids }),
        },
        {
          id: 'time',
          label: t('limits.time'),
          value: t('limits.values.time', { count: limits.maxRunSeconds }),
        },
        {
          id: 'parallel',
          label: t('limits.parallel'),
          value: t('limits.values.parallel', { count: limits.maxSandboxes }),
        },
        { id: 'runtime', label: t('limits.runtime'), value: limits.runtime },
      ]
    : []

  return (
    <SettingsPanel>
      <div className='flex flex-col gap-7'>
        <p className='text-[var(--text-muted)] text-sm'>{t('intro')}</p>
        {!data.configured && <SettingsEmptyState>{t('notInstalled')}</SettingsEmptyState>}
        {data.configured && !data.reachable && (
          <SettingsEmptyState>{t('unreachable')}</SettingsEmptyState>
        )}
        <SettingsSection label={t('switchLabel')}>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex flex-col gap-1'>
              <Label htmlFor='nexora-code-execution'>{t('switchLabel')}</Label>
              <p className='text-[var(--text-muted)] text-caption'>{t('switchHint')}</p>
              {data.updatedAt && (
                <p className='text-[var(--text-muted)] text-caption'>
                  {t('updatedAt', {
                    date: format.dateTime(new Date(data.updatedAt), {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    }),
                  })}
                </p>
              )}
            </div>
            <div className='flex items-center gap-3'>
              {data.enabled && <Badge variant='green'>{t('switchLabel')}</Badge>}
              <Switch
                id='nexora-code-execution'
                checked={data.enabled}
                disabled={!data.configured || update.isPending}
                onCheckedChange={onToggle}
              />
            </div>
          </div>
        </SettingsSection>
        {rows.length > 0 && (
          <SettingsSection label={t('limits.title')}>
            {rows.map((row) => (
              <SettingsField key={row.id} label={row.label}>
                {row.value}
              </SettingsField>
            ))}
          </SettingsSection>
        )}
        <SettingsSection label={t('security.title')}>
          <ul className='flex list-disc flex-col gap-1 pl-5 text-[var(--text-muted)] text-sm'>
            <li>{t('security.network')}</li>
            <li>{t('security.files')}</li>
            <li>{t('security.privileges')}</li>
            <li>{t('security.limits')}</li>
            <li>{t('security.shared')}</li>
          </ul>
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
