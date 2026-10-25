import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Comparison } from '@/app/workspace/[workspaceId]/evaluations/compare/comparison'
import EvaluationsLoading from '@/app/workspace/[workspaceId]/evaluations/loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('evaluations')
  return { title: t('compareMetaTitle') }
}

/** The two series compared are read from the address (nuqs), hence the Suspense boundary. */
export default async function ComparePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return (
    <Suspense fallback={<EvaluationsLoading />}>
      <Comparison workspaceId={workspaceId} />
    </Suspense>
  )
}
