import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Document } from '@/app/workspace/[workspaceId]/knowledge/[id]/[documentId]/document'
import DocumentLoading from '@/app/workspace/[workspaceId]/knowledge/[id]/[documentId]/loading'
import { PermissionAccessBoundary } from '@/ee/access-requests/components/permission-access-boundary'

interface DocumentPageProps {
  params: Promise<{
    id: string
    documentId: string
  }>
  searchParams: Promise<{
    kbName?: string
    docName?: string
  }>
}

export async function generateMetadata({ searchParams }: DocumentPageProps): Promise<Metadata> {
  const [{ docName, kbName }, t] = await Promise.all([
    searchParams,
    getTranslations('knowledge.base'),
  ])
  const title = docName || t('documentFallback')
  const parentName = kbName || t('nameFallback')
  return { title: t('documentPageTitle', { title, parent: parentName }) }
}

export default async function DocumentChunksPage({ params, searchParams }: DocumentPageProps) {
  const [{ id, documentId }, { kbName, docName }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations('knowledge.base'),
  ])

  return (
    <Suspense fallback={<DocumentLoading />}>
      <PermissionAccessBoundary configKey='hideKnowledgeBaseTab'>
        <Document
          knowledgeBaseId={id}
          documentId={documentId}
          knowledgeBaseName={kbName || t('nameFallback')}
          documentName={docName || t('documentFallback')}
        />
      </PermissionAccessBoundary>
    </Suspense>
  )
}
