import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AgentEditor } from '@/app/workspace/[workspaceId]/agents/[workflowId]/agent-editor'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.editor')
  return { title: t('metaTitle') }
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ workspaceId: string; workflowId: string }>
}) {
  const { workspaceId, workflowId } = await params
  return <AgentEditor workspaceId={workspaceId} workflowId={workflowId} />
}
