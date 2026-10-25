import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PromptDetail } from '@/app/workspace/[workspaceId]/prompts/[promptId]/prompt-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.prompts')
  return { title: t('metaTitle') }
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ workspaceId: string; promptId: string }>
}) {
  const { workspaceId, promptId } = await params
  return <PromptDetail workspaceId={workspaceId} promptId={promptId} />
}
