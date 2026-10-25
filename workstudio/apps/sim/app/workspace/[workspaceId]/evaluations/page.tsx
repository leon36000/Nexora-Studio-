import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Evaluations } from '@/app/workspace/[workspaceId]/evaluations/evaluations'
import EvaluationsLoading from '@/app/workspace/[workspaceId]/evaluations/loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('evaluations')
  return { title: t('metaTitle') }
}

/** The page reads its open tab from the URL (nuqs), hence the Suspense boundary. */
export default async function EvaluationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return (
    <Suspense fallback={<EvaluationsLoading />}>
      <Evaluations workspaceId={workspaceId} />
    </Suspense>
  )
}
