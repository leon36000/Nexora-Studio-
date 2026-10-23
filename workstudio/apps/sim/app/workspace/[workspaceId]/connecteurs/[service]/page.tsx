import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ConnectorDetail } from '@/app/workspace/[workspaceId]/connecteurs/[service]/connector-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('connectors.detail')
  return { title: t('metaTitle') }
}

export default async function ConnectorPage({
  params,
}: {
  params: Promise<{ workspaceId: string; service: string }>
}) {
  const { workspaceId, service } = await params
  return <ConnectorDetail workspaceId={workspaceId} service={service} />
}
