import { ChipLink } from '@sim/emcn'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isHosted } from '@/lib/core/config/env-flags'
import { APP_ENTRY_PATH } from '@/lib/navigation/paths'
import { getSharedSlackSearchAppConfiguration } from '@/lib/slack-search/shared-app-env'
import { AuthShell } from '@/app/(auth)/components'

export const metadata: Metadata = {
  title: 'Nexora Search in Slack',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

interface SlackInstallPageProps {
  params: Promise<{ teamId: string }>
}

export default async function SlackInstallPage({ params }: SlackInstallPageProps) {
  const { teamId } = await params
  const app = isHosted ? getSharedSlackSearchAppConfiguration() : null
  if (!/^T[A-Z0-9]{1,199}$/.test(teamId) || !app) notFound()
  const slackUrl = new URL('https://slack.com/app_redirect')
  slackUrl.search = new URLSearchParams({ app: app.id, team: teamId }).toString()
  return (
    <AuthShell>
      <div className='flex flex-col gap-5'>
        <h1 className='text-2xl'>Nexora Search in Slack</h1>
        <p className='text-[var(--text-muted)] text-sm'>
          To start searching, an admin can connect this workspace later from Settings → Nexora Search
          in Slack in their Nexora organization.
        </p>
        <div className='flex gap-2'>
          <ChipLink variant='primary' href={slackUrl.href}>
            Open Slack
          </ChipLink>
          <ChipLink href={APP_ENTRY_PATH}>Open Nexora</ChipLink>
        </div>
      </div>
    </AuthShell>
  )
}
