import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { AgentList } from '@/app/workspace/[workspaceId]/agents/agent-list'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('agents.list')
  return { title: t('metaTitle') }
}

export default async function AgentsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params
  return <AgentList workspaceId={workspaceId} />
}
