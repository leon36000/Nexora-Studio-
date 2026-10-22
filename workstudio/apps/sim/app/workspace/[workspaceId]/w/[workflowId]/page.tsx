import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Workflow from '@/app/workspace/[workspaceId]/w/[workflowId]/workflow'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('editor.page')
  return { title: t('title') }
}

interface WorkflowPageProps {
  params: Promise<{ workspaceId: string; workflowId: string }>
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { workspaceId, workflowId } = await params
  return <Workflow workspaceId={workspaceId} workflowId={workflowId} />
}
