import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CampaignDetail } from '@/app/workspace/[workspaceId]/evaluations/campaigns/[campaignId]/campaign-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('evaluations')
  return { title: t('campaignMetaTitle') }
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ workspaceId: string; campaignId: string }>
}) {
  const { workspaceId, campaignId } = await params
  return <CampaignDetail workspaceId={workspaceId} campaignId={campaignId} />
}
