import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { getHighestPriorityPersonalSubscription } from '@/lib/billing/core/plan'
import { isEnterprise } from '@/lib/billing/plan-helpers'
import { getWorkspaceHostContextForViewer } from '@/lib/workspaces/host-context'
import { CreditUsageView } from '@/app/workspace/[workspaceId]/settings/billing/credit-usage/credit-usage-view'
import CreditUsageLoading from '@/app/workspace/[workspaceId]/settings/billing/credit-usage/loading'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.creditUsage')
  return { title: t('title') }
}

interface CreditUsagePageProps {
  params: Promise<{ workspaceId: string }>
}

export default async function CreditUsagePage({ params }: CreditUsagePageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/login')

  const { workspaceId } = await params
  const hostContext = await getWorkspaceHostContextForViewer(workspaceId, session.user.id)
  if (
    !hostContext ||
    hostContext.hostOrganizationId ||
    hostContext.workspace.billedAccountUserId !== session.user.id
  ) {
    redirect(`/workspace/${workspaceId}/settings/billing`)
  }

  const subscription = await getHighestPriorityPersonalSubscription(session.user.id)
  if (isEnterprise(subscription?.plan)) {
    redirect(`/workspace/${workspaceId}/settings/billing`)
  }

  return (
    <Suspense fallback={<CreditUsageLoading />}>
      <CreditUsageView backHref={`/workspace/${workspaceId}/settings/billing`} />
    </Suspense>
  )
}
