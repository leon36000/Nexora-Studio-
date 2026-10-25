import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ConnectorDetail } from '@/app/workspace/[workspaceId]/connecteurs/[service]/connector-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('connectors.detail')
  return { title: t('metaTitle') }
}

export default async function ConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; service: string }>
  searchParams: Promise<{ scope?: string }>
}) {
  const [{ workspaceId, service }, { scope }] = await Promise.all([params, searchParams])
  return (
    <ConnectorDetail
      workspaceId={workspaceId}
      service={service}
      scope={scope === 'personal' ? 'personal' : 'workspace'}
    />
  )
}
