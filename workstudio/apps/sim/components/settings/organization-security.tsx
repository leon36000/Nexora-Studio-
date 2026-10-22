'use client'

import { ChipCopyInput } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { SessionPolicySettings } from '@/ee/session-policy/components/session-policy-settings'
import { useOrganizationNetwork } from '@/hooks/queries/organization-network'

interface OrganizationSecuritySettingsProps {
  organizationId: string
}

export function OrganizationSecuritySettings({
  organizationId,
}: OrganizationSecuritySettingsProps) {
  const t = useTranslations('settings.organizationSecurity')
  const { hosted, features } = useDeploymentShape()

  return (
    <div className='flex flex-col gap-7'>
      {hosted || features.sessionPolicies ? (
        <SettingsSection label={t('sessionPolicies')}>
          <SessionPolicySettings key={organizationId} organizationId={organizationId} />
        </SettingsSection>
      ) : (
        <SettingsPanel />
      )}
      <OrganizationNetworkSection organizationId={organizationId} />
    </div>
  )
}

function OrganizationNetworkSection({ organizationId }: OrganizationSecuritySettingsProps) {
  const t = useTranslations('settings.organizationSecurity')
  const { data, error, isPending, isFetching, refetch } = useOrganizationNetwork(organizationId)

  return (
    <SettingsSection label={t('outboundIps')}>
      {isPending ? (
        <SettingsEmptyState variant='inline'>
          <span role='status'>{t('loading')}</span>
        </SettingsEmptyState>
      ) : error || data?.mode === 'unavailable' ? (
        <SettingsQueryErrorState
          error={error}
          fallback={t('loadError')}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
          variant='inline'
        />
      ) : data?.mode === 'gateway' && data.publicIps.length > 0 ? (
        <div className='flex flex-col gap-3'>
          <p className='text-[var(--text-muted)] text-caption'>{t('allowlistHint')}</p>
          <div className='flex flex-col gap-2'>
            {data.publicIps.map((ip) => (
              <ChipCopyInput
                key={ip}
                value={`${ip}/32`}
                aria-label={t('ipAriaLabel', { ip })}
                copyLabel={t('copyIp', { address: `${ip}/32` })}
                inputClassName='font-mono'
              />
            ))}
          </div>
        </div>
      ) : data ? (
        <p role='status' className='text-[var(--text-muted)] text-sm'>
          {data.mode === 'blocked'
            ? t('paused')
            : data.mode === 'gateway'
              ? t('notAvailableYet')
              : t('notConfigured')}
        </p>
      ) : null}
    </SettingsSection>
  )
}
