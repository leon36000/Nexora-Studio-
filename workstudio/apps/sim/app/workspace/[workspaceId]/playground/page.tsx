import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Playground } from '@/app/workspace/[workspaceId]/playground/playground'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.playground')
  return { title: t('metaTitle') }
}

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <Playground workspaceId={workspaceId} />
}
