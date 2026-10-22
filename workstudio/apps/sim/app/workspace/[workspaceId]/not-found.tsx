'use client'

import { Chip, ChipLink } from '@sim/emcn'
import { ArrowLeft, Compass, Home } from '@sim/emcn/icons'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ErrorShell } from '@/app/workspace/[workspaceId]/components/error'

export default function WorkspaceNotFound() {
  const router = useRouter()
  const t = useTranslations('errors.workspaceNotFound')
  const { workspaceId } = useParams<{ workspaceId?: string }>()
  const homeHref = workspaceId ? `/workspace/${workspaceId}` : '/'

  return (
    <ErrorShell
      title={t('title')}
      description={t('description')}
      icon={<Compass className='size-[22px]' />}
    >
      <Chip leftIcon={ArrowLeft} onClick={() => router.back()}>
        {t('goBack')}
      </Chip>
      <ChipLink href={homeHref} variant='primary' leftIcon={Home}>
        {t('returnHome')}
      </ChipLink>
    </ErrorShell>
  )
}
