import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { BatchDetail } from '@/app/workspace/[workspaceId]/batches/[batchId]/batch-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('batches')
  return { title: t('detailMetaTitle') }
}

export default async function BatchPage({
  params,
}: {
  params: Promise<{ workspaceId: string; batchId: string }>
}) {
  const { workspaceId, batchId } = await params
  return <BatchDetail workspaceId={workspaceId} batchId={batchId} />
}
