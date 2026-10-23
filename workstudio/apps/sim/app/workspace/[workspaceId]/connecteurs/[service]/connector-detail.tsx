'use client'

import { type ReactNode, useState } from 'react'
import { Badge, Chip, ChipConfirmModal, ChipLink, cn, Skeleton, toast } from '@sim/emcn'
import { ArrowLeft, ArrowUpRight } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  RESOURCE_TILE_BASE,
  RESOURCE_TILE_PLAIN,
} from '@/app/workspace/[workspaceId]/components/resource-tile'
import { CredentialForm } from '@/app/workspace/[workspaceId]/connecteurs/[service]/components/credential-form'
import { OAuthConnect } from '@/app/workspace/[workspaceId]/connecteurs/[service]/components/oauth-connect'
import { ConnectorsPageFrame } from '@/app/workspace/[workspaceId]/connecteurs/components/connectors-page-frame'
import { ServiceLogo } from '@/app/workspace/[workspaceId]/connecteurs/components/service-logo'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  type ConnectorDetail as ConnectorDetailData,
  getConnectorErrorCode,
  useConnector,
  useDisconnectConnector,
} from '@/hooks/queries/nexora-connectors'

const AUTH_TYPES = ['api_key', 'custom_credential', 'oauth2', 'no_auth'] as const
type AuthType = (typeof AUTH_TYPES)[number]
type ConnectMethod = ConnectorDetailData['auth'][number] & { type: Exclude<AuthType, 'no_auth'> }

function isAuthType(value: string): value is AuthType {
  return (AUTH_TYPES as readonly string[]).includes(value)
}

/** The ways this page can connect the service: credential forms that list fields, and OAuth. */
function connectMethods(auth: ConnectorDetailData['auth']): ConnectMethod[] {
  return auth.filter(
    (entry): entry is ConnectMethod =>
      entry.type === 'oauth2' ||
      ((entry.type === 'api_key' || entry.type === 'custom_credential') &&
        (entry.fields?.length ?? 0) > 0)
  )
}

interface ConnectorDetailProps {
  workspaceId: string
  service: string
}

/**
 * Nexora edition: one Nexora Connect service — what it does, its actions, and this workspace's
 * connection. Editors connect it (API key, credentials or OAuth) and disconnect it; other
 * members see the state only.
 */
export function ConnectorDetail({ workspaceId, service }: ConnectorDetailProps) {
  const t = useTranslations('connectors')
  const { data, error, isPending, isFetching, refetch } = useConnector(workspaceId, service)
  const disconnect = useDisconnectConnector()
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  const name = data?.service?.displayName ?? service
  const authLabel = (type: string) => (isAuthType(type) ? t(`detail.authTypes.${type}`) : type)

  const backLink = (
    <ChipLink
      href={`/workspace/${workspaceId}/connecteurs`}
      leftIcon={ArrowLeft}
      className='self-start'
    >
      {t('detail.back')}
    </ChipLink>
  )

  if (isPending || !data) {
    return (
      <ConnectorsPageFrame title={isPending ? '' : name} leading={backLink}>
        {isPending ? (
          <Skeleton className='h-[120px] w-full rounded-lg' />
        ) : getConnectorErrorCode(error) === 'forbidden' ? (
          <SettingsEmptyState variant='inline'>{t('errors.forbidden')}</SettingsEmptyState>
        ) : (
          <SettingsQueryErrorState
            error={t(`errors.${getConnectorErrorCode(error)}`)}
            fallback={t('errors.loadFailed')}
            isRetrying={isFetching}
            onRetry={() => void refetch()}
          />
        )}
      </ConnectorsPageFrame>
    )
  }

  if (!data.service) {
    return (
      <ConnectorsPageFrame title={service} leading={backLink}>
        <SettingsEmptyState variant='inline'>{t('detail.notFound')}</SettingsEmptyState>
      </ConnectorsPageFrame>
    )
  }

  const { connection, canManage, actions } = data
  const methods = connectMethods(data.auth)
  const method = methods.find((entry) => entry.type === selectedMethod) ?? methods[0]
  const needsNoAuth = data.auth.length > 0 && data.auth.every((entry) => entry.type === 'no_auth')

  const handleDisconnect = () => {
    disconnect.mutate(
      { workspaceId, service },
      {
        onSuccess: () => {
          setConfirmingDisconnect(false)
          toast.success(t('detail.disconnectedToast', { name }))
        },
        onError: (cause) => {
          setConfirmingDisconnect(false)
          toast.error(t(`errors.${getConnectorErrorCode(cause)}`))
        },
      }
    )
  }

  let connectionBody: ReactNode
  if (connection) {
    connectionBody = (
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-[var(--text-body)] text-small'>
          {t('detail.connectedWith', { method: authLabel(connection.authType) })}
        </p>
        {canManage && (
          <Chip variant='border' onClick={() => setConfirmingDisconnect(true)}>
            {t('detail.disconnect')}
          </Chip>
        )}
      </div>
    )
  } else if (needsNoAuth) {
    connectionBody = <p className='text-[var(--text-muted)] text-small'>{t('detail.noAuth')}</p>
  } else if (!canManage) {
    connectionBody = <p className='text-[var(--text-muted)] text-small'>{t('detail.readOnly')}</p>
  } else if (!method) {
    connectionBody = <p className='text-[var(--text-muted)] text-small'>{t('detail.noMethod')}</p>
  } else {
    connectionBody = (
      <div className='flex flex-col gap-4'>
        {methods.length > 1 && (
          <div className='flex flex-wrap gap-1'>
            {methods.map((entry) => (
              <Chip
                key={entry.type}
                active={entry.type === method.type}
                aria-pressed={entry.type === method.type}
                onClick={() => setSelectedMethod(entry.type)}
              >
                {entry.label ?? authLabel(entry.type)}
              </Chip>
            ))}
          </div>
        )}
        {method.type === 'oauth2' ? (
          <OAuthConnect
            workspaceId={workspaceId}
            service={service}
            serviceName={name}
            oauth={data.oauth}
          />
        ) : (
          <CredentialForm
            key={method.type}
            workspaceId={workspaceId}
            service={service}
            serviceName={name}
            authType={method.type}
            fields={method.fields ?? []}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <ConnectorsPageFrame
        title={name}
        leading={
          <>
            {backLink}
            <div className={cn(RESOURCE_TILE_BASE, RESOURCE_TILE_PLAIN, '[&_img]:size-5')}>
              <ServiceLogo name={name} iconUrl={data.service.iconUrl} />
            </div>
          </>
        }
        actions={
          <>
            {connection ? (
              <Badge variant='green' size='sm'>
                {t('detail.status.connected')}
              </Badge>
            ) : (
              <Badge variant='gray' size='sm'>
                {t('detail.status.notConnected')}
              </Badge>
            )}
            {data.service.homepageUrl && (
              <ChipLink
                href={data.service.homepageUrl}
                target='_blank'
                rel='noopener noreferrer'
                rightIcon={ArrowUpRight}
              >
                {t('detail.website')}
              </ChipLink>
            )}
          </>
        }
      >
        {data.service.description && (
          <p className='text-[var(--text-body)] text-small'>{data.service.description}</p>
        )}

        <SettingsSection label={t('detail.connectionSection')}>{connectionBody}</SettingsSection>

        <SettingsSection
          label={t('detail.actionsSection')}
          headerAccessory={
            <span className='text-[var(--text-muted)] text-caption'>
              {t('detail.actionsCount', { count: actions.length })}
            </span>
          }
          action={
            actions.length > 0 ? (
              <Chip aria-expanded={showActions} onClick={() => setShowActions((open) => !open)}>
                {showActions ? t('detail.hideActions') : t('detail.showActions')}
              </Chip>
            ) : undefined
          }
        >
          {showActions && (
            <ul className='flex flex-col divide-y divide-[var(--border)]'>
              {actions.map((action) => (
                <li key={action.id} className='flex flex-col gap-0.5 py-2'>
                  <span className='text-[var(--text-body)] text-small'>{action.name}</span>
                  {action.description && (
                    <span className='text-[var(--text-muted)] text-caption'>
                      {action.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>
      </ConnectorsPageFrame>

      <ChipConfirmModal
        open={confirmingDisconnect}
        onOpenChange={(open) => {
          if (!open && !disconnect.isPending) setConfirmingDisconnect(false)
        }}
        title={t('detail.disconnectDialog.title', { name })}
        text={t('detail.disconnectDialog.text', { name })}
        dismissLabel={t('detail.disconnectDialog.cancel')}
        confirm={{
          label: t('detail.disconnect'),
          onClick: handleDisconnect,
          pending: disconnect.isPending,
          pendingLabel: t('detail.disconnecting'),
        }}
      />
    </>
  )
}
