import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DatasetDetail } from '@/app/workspace/[workspaceId]/evaluations/datasets/[datasetId]/dataset-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('evaluations')
  return { title: t('datasetMetaTitle') }
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ workspaceId: string; datasetId: string }>
}) {
  const { workspaceId, datasetId } = await params
  return <DatasetDetail workspaceId={workspaceId} datasetId={datasetId} />
}
