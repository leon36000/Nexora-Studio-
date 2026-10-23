import { Suspense } from 'react'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { isChatEnabled } from '@/lib/core/config/env-flags'
import { getQueryClient } from '@/app/_shell/providers/get-query-client'
import { NexoraHome } from '@/app/workspace/[workspaceId]/home/nexora-home/nexora-home'
import { HomeFallback } from './home-fallback'

/**
 * The upstream chat home, loaded only when Chat is enabled: in the Nexora edition every member
 * lands on the Nexora home, which must not ship the chat's ~1.4 MB of client code.
 */
const Home = dynamic(() => import('./home').then((m) => m.Home))

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
  const { prefetchHomeSurface } = await import('@/app/workspace/[workspaceId]/home/prefetch')
  await prefetchHomeSurface(queryClient, workspaceId, userId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<HomeFallback />}>
        <Home userName={session?.user?.name} userId={userId} />
      </Suspense>
    </HydrationBoundary>
  )
}
