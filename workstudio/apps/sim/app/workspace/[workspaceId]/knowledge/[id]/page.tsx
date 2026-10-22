import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { KnowledgeBase } from '@/app/workspace/[workspaceId]/knowledge/[id]/base'
import KnowledgeBaseLoading from '@/app/workspace/[workspaceId]/knowledge/[id]/loading'
import { PermissionAccessBoundary } from '@/ee/access-requests/components/permission-access-boundary'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    kbName?: string
  }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ kbName }, t] = await Promise.all([searchParams, getTranslations('knowledge.base')])
  return { title: kbName || t('nameFallback') }
}

export default async function KnowledgeBasePage({ params, searchParams }: PageProps) {
  const [{ id }, { kbName }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations('knowledge.base'),
  ])

  return (
    <Suspense fallback={<KnowledgeBaseLoading />}>
      <PermissionAccessBoundary configKey='hideKnowledgeBaseTab'>
        <KnowledgeBase id={id} knowledgeBaseName={kbName || t('nameFallback')} />
      </PermissionAccessBoundary>
    </Suspense>
  )
}
