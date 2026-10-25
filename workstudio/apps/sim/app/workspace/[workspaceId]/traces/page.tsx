import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import TracesLoading from '@/app/workspace/[workspaceId]/traces/loading'
import { Traces } from '@/app/workspace/[workspaceId]/traces/traces'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('traces.page')
  return { title: t('metaTitle') }
}

/** The screen reads its filters and the open trace from the URL (nuqs), hence the Suspense boundary. */
export default async function TracesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  return (
    <Suspense fallback={<TracesLoading />}>
      <Traces workspaceId={workspaceId} />
    </Suspense>
  )
}
