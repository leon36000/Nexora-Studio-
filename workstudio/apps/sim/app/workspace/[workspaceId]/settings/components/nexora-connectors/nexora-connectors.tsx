'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { Badge, Chip, ChipCopyInput, ChipInput, Label, Skeleton, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import { SEARCH_DEBOUNCE_MS } from '@/lib/url-state'
import { ServiceLogo } from '@/app/workspace/[workspaceId]/connecteurs/components/service-logo'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  type ConnectorCatalogService,
  getConnectorErrorCode,
  useConnector,
  useConnectorCatalog,
  useSetConnectorOAuthApp,
} from '@/hooks/queries/nexora-connectors'
import { useDebounce } from '@/hooks/use-debounce'

const SKELETON_ROWS = [0, 1, 2] as const
const SEARCH_PAGE_SIZE = 100
const CLIENT_ID_FIELD = 'nexora-connector-client-id'
const CLIENT_SECRET_FIELD = 'nexora-connector-client-secret'

interface NexoraConnectorAppsProps {
  workspaceId: string
}

/**
 * Réglages › Connecteurs: instance admins register the operator's OAuth application for a
 * service (client ID and secret, sent to Nexora Connect, never kept here), then copy the
 * redirect address to declare with the provider.
 */
export function NexoraConnectorApps({ workspaceId }: NexoraConnectorAppsProps) {
  const t = useTranslations('connectors')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ConnectorCatalogService | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const query = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS)
  const catalog = useConnectorCatalog(
    selected ? undefined : workspaceId,
    { query, category: '' },
    SEARCH_PAGE_SIZE
  )
  const detail = useConnector(workspaceId, selected?.service)
  const saveApp = useSetConnectorOAuthApp()

  const oauthServices = useMemo(
    () =>
      catalog.data?.pages
        .flatMap((page) => page.services)
        .filter((service) => service.authTypes.includes('oauth2')) ?? [],
    [catalog.data]
  )

  const dirty = Boolean(clientId || clientSecret)
  const canSave = Boolean(selected && clientId.trim() && clientSecret.trim())

  const discard = () => {
    setClientId('')
    setClientSecret('')
  }

  useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: saveApp.isPending,
    onDiscard: discard,
  })

  const selectService = (service: ConnectorCatalogService | null) => {
    setSelected(service)
    saveApp.reset()
  }

  const handleSave = () => {
    if (!selected || !canSave) return
    const name = selected.displayName
    saveApp.mutate(
      { service: selected.service, clientId: clientId.trim(), clientSecret: clientSecret.trim() },
      {
        onSuccess: () => {
          discard()
          toast.success(t('settings.saved', { name }))
        },
        onError: (error) => {
          const code = getConnectorErrorCode(error)
          toast.error(code === 'forbidden' ? t('settings.forbidden') : t(`errors.${code}`))
        },
      }
    )
  }

  const savedApp =
    saveApp.data && saveApp.variables?.service === selected?.service ? saveApp.data : null
  const configured = savedApp?.configured ?? detail.data?.oauth?.configured ?? false
  const redirectUri = savedApp?.redirectUri ?? detail.data?.oauth?.redirectUri ?? null

  let serviceBody: ReactNode
  if (selected) {
    serviceBody = (
      <div className={RESOURCE_LIST_STACK}>
        <SettingsResourceRow
          icon={<ServiceLogo name={selected.displayName} />}
          title={selected.displayName}
          badge={
            detail.data ? (
              <Badge variant={configured ? 'green' : 'gray'} size='sm'>
                {configured ? t('settings.configured') : t('settings.notConfigured')}
              </Badge>
            ) : undefined
          }
          trailing={
            <Chip variant='border' onClick={() => selectService(null)}>
              {t('settings.change')}
            </Chip>
          }
        />
      </div>
    )
  } else if (catalog.isPending) {
    serviceBody = (
      <div className={RESOURCE_LIST_STACK}>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className='h-[52px] w-full rounded-lg' />
        ))}
      </div>
    )
  } else if (!catalog.data) {
    serviceBody = (
      <SettingsQueryErrorState
        error={t(`errors.${getConnectorErrorCode(catalog.error)}`)}
        fallback={t('errors.loadFailed')}
        isRetrying={catalog.isFetching}
        onRetry={() => void catalog.refetch()}
      />
    )
  } else {
    serviceBody = (
      <div className='flex flex-col gap-3'>
        {oauthServices.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('settings.noResults')}</SettingsEmptyState>
        ) : (
          <div className={RESOURCE_LIST_STACK}>
            {oauthServices.map((service) => (
              <SettingsResourceRow
                key={service.service}
                icon={<ServiceLogo name={service.displayName} />}
                title={service.displayName}
                onClick={() => selectService(service)}
                clickLabel={t('settings.select', { name: service.displayName })}
              />
            ))}
          </div>
        )}
        {catalog.hasNextPage && (
          <Chip
            variant='border'
            className='self-center'
            disabled={catalog.isFetchingNextPage}
            onClick={() => void catalog.fetchNextPage()}
          >
            {catalog.isFetchingNextPage ? t('catalog.loadingMore') : t('catalog.loadMore')}
          </Chip>
        )}
      </div>
    )
  }

  return (
    <SettingsPanel
      actions={saveDiscardActions({
        dirty,
        saving: saveApp.isPending,
        onSave: handleSave,
        onDiscard: discard,
        saveDisabled: !canSave,
        saveTooltip: canSave ? undefined : t('settings.saveTooltip'),
      })}
      search={
        selected
          ? undefined
          : { value: search, onChange: setSearch, placeholder: t('settings.searchPlaceholder') }
      }
    >
      <SettingsSection label={t('settings.serviceSection')}>{serviceBody}</SettingsSection>

      {selected && (
        <SettingsSection label={t('settings.appSection')}>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-[9px]'>
              <Label htmlFor={CLIENT_ID_FIELD}>{t('settings.clientId')}</Label>
              <ChipInput
                id={CLIENT_ID_FIELD}
                autoComplete='off'
                spellCheck={false}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              />
            </div>
            <div className='flex flex-col gap-[9px]'>
              <Label htmlFor={CLIENT_SECRET_FIELD}>{t('settings.clientSecret')}</Label>
              <ChipInput
                id={CLIENT_SECRET_FIELD}
                type='password'
                autoComplete='new-password'
                spellCheck={false}
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
              />
              <p className='text-[var(--text-muted)] text-caption'>{t('settings.secretNotice')}</p>
            </div>
            {(detail.data || savedApp) && (
              <div className='flex flex-col gap-[9px]'>
                <Label>{t('settings.redirectUri')}</Label>
                {redirectUri ? (
                  <ChipCopyInput value={redirectUri} copyLabel={t('settings.copy')} />
                ) : (
                  <p className='text-[var(--text-muted)] text-caption'>
                    {t('settings.redirectUnavailable')}
                  </p>
                )}
              </div>
            )}
          </div>
        </SettingsSection>
      )}
    </SettingsPanel>
  )
}
