import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ConnectorsPageFrame } from '@/app/workspace/[workspaceId]/connecteurs/components/connectors-page-frame'
import { Connectors } from '@/app/workspace/[workspaceId]/connecteurs/connectors'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('connectors.catalog')
  return { title: t('metaTitle') }
}

/** The catalog reads its search and category from the URL (nuqs), hence the Suspense boundary. */
export default async function ConnectorsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const [{ workspaceId }, t] = await Promise.all([params, getTranslations('connectors.catalog')])
  return (
    <Suspense fallback={<ConnectorsPageFrame title={t('title')} />}>
      <Connectors workspaceId={workspaceId} />
    </Suspense>
  )
}
