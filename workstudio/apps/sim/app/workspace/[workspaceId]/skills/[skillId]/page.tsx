import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SkillDetail } from '@/app/workspace/[workspaceId]/skills/[skillId]/skill-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('integrations.skillsPage')
  return { title: t('metaDetail') }
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; skillId: string }>
}) {
  const { workspaceId, skillId } = await params
  return <SkillDetail workspaceId={workspaceId} skillId={skillId} />
}
