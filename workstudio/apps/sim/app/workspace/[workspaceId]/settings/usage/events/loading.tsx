'use client'

import { ArrowLeft } from '@sim/emcn/icons'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'

export default function UsageEventsLoading() {
  const router = useRouter()
  const t = useTranslations('settings.usageEvents')
  const { workspaceId } = useParams<{ workspaceId: string }>()

  return (
    <SettingsPanel
      back={{
        text: t('back'),
        icon: ArrowLeft,
        onSelect: () => router.push(`/workspace/${workspaceId}/settings/usage`),
      }}
      title={t('title')}
      description={t('description')}
    />
  )
}
