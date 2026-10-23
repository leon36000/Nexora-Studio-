import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Developers } from '@/app/workspace/[workspaceId]/developpeurs/developers'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('developers.page')
  return { title: t('title') }
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <Developers workspaceId={workspaceId} />
}
