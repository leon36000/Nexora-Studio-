import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Assistant } from '@/app/workspace/[workspaceId]/assistant/assistant'
import AssistantLoading from '@/app/workspace/[workspaceId]/assistant/loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('assistant')
  return { title: t('metaTitle') }
}

/** The open conversation is read from the URL (nuqs), hence the Suspense boundary. */
export default async function AssistantPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return (
    <Suspense fallback={<AssistantLoading />}>
      <Assistant workspaceId={workspaceId} />
    </Suspense>
  )
}
