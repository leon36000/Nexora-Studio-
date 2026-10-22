import { Suspense } from 'react'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { getQueryClient } from '@/app/_shell/providers/get-query-client'
import { Knowledge } from '@/app/workspace/[workspaceId]/knowledge/knowledge'
import KnowledgeLoading from '@/app/workspace/[workspaceId]/knowledge/loading'
import { prefetchKnowledgeBases } from '@/app/workspace/[workspaceId]/knowledge/prefetch'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('knowledge.list')
  return { title: t('rootLabel') }
}

/**
 * Knowledge Base page entry. `Knowledge` reads URL query params via nuqs (which
 * uses `useSearchParams` internally), so it must sit under a Suspense boundary.
 * The fallback renders the real chrome so a suspend never shows a blank frame;
 * the route-level `loading.tsx` covers the navigation/chunk-load transition.
 */
export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const [{ workspaceId }, session] = await Promise.all([params, getSession()])
  const queryClient = getQueryClient()
  await prefetchKnowledgeBases(queryClient, workspaceId, session?.user?.id)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<KnowledgeLoading />}>
        <Knowledge />
      </Suspense>
    </HydrationBoundary>
  )
}
