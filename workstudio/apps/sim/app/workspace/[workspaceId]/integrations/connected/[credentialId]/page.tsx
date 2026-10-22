import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ConnectedCredentialDetail } from '@/app/workspace/[workspaceId]/integrations/connected/[credentialId]/connected-credential-detail'
import { PermissionAccessBoundary } from '@/ee/access-requests/components/permission-access-boundary'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('integrations.page')
  return { title: t('connectedTitle') }
}

export default async function ConnectedCredentialPage({
  params,
}: {
  params: Promise<{ workspaceId: string; credentialId: string }>
}) {
  const { workspaceId, credentialId } = await params
  return (
    <PermissionAccessBoundary configKey='hideIntegrationsTab'>
      <ConnectedCredentialDetail workspaceId={workspaceId} credentialId={credentialId} />
    </PermissionAccessBoundary>
  )
}
