import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import SecretDetailLoading from '@/app/workspace/[workspaceId]/settings/secrets/[credentialId]/loading'
import { SecretDetail } from '@/app/workspace/[workspaceId]/settings/secrets/[credentialId]/secret-detail'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.secretDetail')
  return { title: t('pageTitle') }
}

export default async function SecretDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; credentialId: string }>
}) {
  const { workspaceId, credentialId } = await params
  return (
    <Suspense fallback={<SecretDetailLoading />}>
      <SecretDetail workspaceId={workspaceId} credentialId={credentialId} />
    </Suspense>
  )
}
