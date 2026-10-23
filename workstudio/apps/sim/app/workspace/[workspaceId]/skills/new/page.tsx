import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SkillCreate } from '@/app/workspace/[workspaceId]/skills/new/skill-create'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('integrations.skillsPage')
  return { title: t('metaNew') }
}

export default async function SkillCreatePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <SkillCreate workspaceId={workspaceId} />
}
