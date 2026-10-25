'use client'

import { ChipTag } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface VerdictTagProps {
  verdict: 'pass' | 'fail' | 'error' | null
  status: 'pending' | 'running' | 'done' | 'error'
}

/** The verdict of an item: passed, failed, or could not be run or judged. */
export function VerdictTag({ verdict, status }: VerdictTagProps) {
  const t = useTranslations('evaluations.verdicts')
  const effective = status === 'error' ? 'error' : verdict
  if (!effective) return null
  return (
    <ChipTag variant='gray' invalid={effective === 'error' || effective === 'fail'}>
      {t(effective)}
    </ChipTag>
  )
}
