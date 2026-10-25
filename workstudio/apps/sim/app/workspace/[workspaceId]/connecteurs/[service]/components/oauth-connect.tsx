'use client'

import { useEffect, useRef } from 'react'
import { Chip, ChipLink, toast } from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  type ConnectorDetail,
  type ConnectorScope,
  getConnectorErrorCode,
  useConnectConnectorWithOAuth,
} from '@/hooks/queries/nexora-connectors'

const POPUP_NAME = 'nexora-connect-oauth'
const POPUP_FEATURES = 'popup,width=560,height=720'

interface OAuthConnectProps {
  workspaceId: string
  scope: ConnectorScope
  service: string
  serviceName: string
  oauth: ConnectorDetail['oauth']
}

/**
 * « Se connecter avec … »: the provider's consent opens in a window while the page follows the
 * request. Without a public address for Nexora Connect (the provider could not send the person
 * back), OAuth is shown as unavailable; without the operator's OAuth application (Réglages ›
 * Connecteurs) the button is replaced by what an administrator has to do.
 */
export function OAuthConnect({
  workspaceId,
  scope,
  service,
  serviceName,
  oauth,
}: OAuthConnectProps) {
  const t = useTranslations('connectors')
  const controllerRef = useRef<AbortController | null>(null)
  const connect = useConnectConnectorWithOAuth()

  useEffect(() => () => controllerRef.current?.abort(), [])

  if (!oauth?.available) {
    return <p className='text-[var(--text-muted)] text-small'>{t('detail.oauth.unavailable')}</p>
  }
  if (!oauth.configured) {
    return (
      <div className='flex flex-col items-start gap-3'>
        <p className='text-[var(--text-muted)] text-small'>
          {t('detail.oauth.notConfigured', { name: serviceName })}
        </p>
        <ChipLink variant='border' href={`/workspace/${workspaceId}/settings/connectors`}>
          {t('detail.oauth.openSettings')}
        </ChipLink>
      </div>
    )
  }

  const handleConnect = () => {
    const popup = window.open('about:blank', POPUP_NAME, POPUP_FEATURES)
    if (!popup) {
      toast.error(t('detail.oauth.popupBlocked'))
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    connect.mutate(
      { workspaceId, service, scope, popup, signal: controller.signal },
      {
        onSuccess: (outcome) => {
          if (!popup.closed) popup.close()
          if (outcome === 'cancelled') return
          const message = t(`detail.oauth.outcomes.${outcome}`, { name: serviceName })
          if (outcome === 'connected') toast.success(message)
          else toast.error(message)
        },
        onError: (error) => {
          if (!popup.closed) popup.close()
          if (controller.signal.aborted) return
          toast.error(t(`errors.${getConnectorErrorCode(error)}`))
        },
      }
    )
  }

  if (connect.isPending) {
    return (
      <div className='flex flex-wrap items-center gap-3'>
        <span className='flex items-center gap-2 text-[var(--text-muted)] text-small'>
          <Loader className='size-[14px]' animate />
          {t('detail.oauth.waiting', { name: serviceName })}
        </span>
        <Chip variant='border' onClick={() => controllerRef.current?.abort()}>
          {t('detail.oauth.cancel')}
        </Chip>
      </div>
    )
  }

  return (
    <Chip variant='primary' className='self-start' onClick={handleConnect}>
      {t('detail.oauth.connectWith', { name: serviceName })}
    </Chip>
  )
}
