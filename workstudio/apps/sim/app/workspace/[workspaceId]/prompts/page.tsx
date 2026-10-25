import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PromptList } from '@/app/workspace/[workspaceId]/prompts/prompt-list'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.prompts')
  return { title: t('metaTitle') }
}

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <PromptList workspaceId={workspaceId} />
}
