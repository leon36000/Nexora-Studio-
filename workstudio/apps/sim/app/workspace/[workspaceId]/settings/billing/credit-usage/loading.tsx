'use client'

import { ArrowLeft } from '@sim/emcn/icons'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'

interface CreditUsageLoadingProps {
  backHref: string
}

/**
 * Shared credit-usage loading chrome with an explicit navigation destination.
 */
export function CreditUsageLoading({ backHref }: CreditUsageLoadingProps) {
  const router = useRouter()
  const t = useTranslations('settings.creditUsage')

  return (
    <SettingsPanel
      back={{
        text: t('back'),
        icon: ArrowLeft,
        onSelect: () => router.push(backHref),
      }}
      title={t('title')}
      description={t('description')}
    />
  )
}

/**
 * Workspace route-level loading fallback used by Next.js and `page.tsx`.
 */
export default function WorkspaceCreditUsageLoading() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  return <CreditUsageLoading backHref={`/workspace/${workspaceId}/settings/billing`} />
}
