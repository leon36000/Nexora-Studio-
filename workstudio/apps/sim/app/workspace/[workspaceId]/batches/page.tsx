import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Batches } from '@/app/workspace/[workspaceId]/batches/batches'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('batches')
  return { title: t('metaTitle') }
}

export default async function BatchesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <Batches workspaceId={workspaceId} />
}
