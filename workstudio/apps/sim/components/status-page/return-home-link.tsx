'use client'

import { ChipLink } from '@sim/emcn'
import { useTranslations } from 'next-intl'

/** A document navigation initializes the landing theme when leaving an app status page. */
export function ReturnHomeLink() {
  const t = useTranslations('shell.statusPage')
  return (
    <ChipLink
      variant='primary'
      href='/'
      prefetch={false}
      onNavigate={(event) => {
        event.preventDefault()
        window.location.assign('/')
      }}
    >
      {t('returnHome')}
    </ChipLink>
  )
}
