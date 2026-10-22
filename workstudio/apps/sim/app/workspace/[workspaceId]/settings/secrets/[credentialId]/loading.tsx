'use client'

import { ChipLink } from '@sim/emcn'
import { ArrowLeft } from '@sim/emcn/icons'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CredentialDetailLayout } from '@/app/workspace/[workspaceId]/components/credential-detail'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'

/**
 * Serves both the route transition into a secret and the in-page Suspense boundary the
 * detail's `useQueryState` needs, so the chrome never flashes between the two.
 */
export default function SecretDetailLoading() {
  const t = useTranslations('settings.secretDetail')
  const { workspaceId } = useParams<{ workspaceId: string }>()

  return (
    <CredentialDetailLayout
      back={
        <ChipLink href={`/workspace/${workspaceId}/settings/secrets`} leftIcon={ArrowLeft}>
          {t('back')}
        </ChipLink>
      }
    >
      <SettingsEmptyState variant='inline'>{t('loading')}</SettingsEmptyState>
    </CredentialDetailLayout>
  )
}
