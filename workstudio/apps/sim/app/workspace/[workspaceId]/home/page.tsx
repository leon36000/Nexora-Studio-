import { Suspense } from 'react'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { isChatEnabled } from '@/lib/core/config/env-flags'
import { getQueryClient } from '@/app/_shell/providers/get-query-client'
import { NexoraHome } from '@/app/workspace/[workspaceId]/home/nexora-home/nexora-home'
import { prefetchHomeSurface } from '@/app/workspace/[workspaceId]/home/prefetch'
import { Home } from './home'
import { HomeFallback } from './home-fallback'

export async function generateMetadata(): Promise<Metadata> {
  if (isChatEnabled) return { title: 'New chat' } // i18n-ignore: upstream chat title, unchanged
  const t = await getTranslations('home.nexoraHome')
  return { title: t('metaTitle') }
}

export default async function HomePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params

  // Nexora edition: without the chat backend, the home page is Nexora's own.
  if (!isChatEnabled) {
    return <NexoraHome workspaceId={workspaceId} />
  }

  const session = await getSession()
  const userId = session?.user?.id
  const queryClient = getQueryClient()
  await prefetchHomeSurface(queryClient, workspaceId, userId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<HomeFallback />}>
        <Home userName={session?.user?.name} userId={userId} />
      </Suspense>
    </HydrationBoundary>
  )
}
