import { StatusPageContent } from '@sim/emcn'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ReturnHomeLink } from '@/components/status-page/return-home-link'
import { LogoShell } from '@/app/(landing)/components/logo-shell'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('errors.notFound')
  return { title: t('metaTitle'), robots: { index: false, follow: true } }
}

export default async function NotFound() {
  const t = await getTranslations('errors.notFound')
  return (
    <LogoShell center theme='inherit'>
      <StatusPageContent title={t('title')} description={t('description')}>
        <ReturnHomeLink />
      </StatusPageContent>
    </LogoShell>
  )
}
