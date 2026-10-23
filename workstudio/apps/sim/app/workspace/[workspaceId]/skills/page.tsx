import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { IntegrationTabsHeader } from '@/app/workspace/[workspaceId]/components/integration-tabs-header'
import { Skills } from '@/app/workspace/[workspaceId]/skills/skills'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('integrations.skillsPage')
  return { title: t('metaTitle') }
}

/**
 * Skills page entry. `Skills` reads URL query params via nuqs (which uses
 * `useSearchParams` internally), so it must sit under a Suspense boundary. The
 * fallback renders the real page chrome (background + tab header) so a suspend
 * never shows a blank frame.
 */
export default async function SkillsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params

  return (
    <Suspense
      fallback={
        <div className='flex h-full flex-col bg-[var(--bg)]'>
          <IntegrationTabsHeader active='skills' workspaceId={workspaceId} />
        </div>
      }
    >
      <Skills />
    </Suspense>
  )
}
