'use client'

import { useTranslations } from 'next-intl'
import { explainStepError } from '@/lib/nexora/steps/errors'

interface ErrorExplanationProps {
  message: string
}

/** What an execution error means, in plain French, with the original message kept below. */
export function ErrorExplanation({ message }: ErrorExplanationProps) {
  const t = useTranslations('steps')
  const explanation = explainStepError(message)
  return (
    <div
      role='alert'
      className='mt-2 flex flex-col gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-4)] p-3'
    >
      <span className='text-[var(--text-primary)] text-small'>{t('test.errorTitle')}</span>
      <span className='text-[var(--text-body)] text-small'>
        {t(`errors.${explanation.key}`, explanation.values)}
      </span>
      <span className='text-[var(--text-muted)] text-caption'>{t('test.fixHint')}</span>
      {message.trim() && (
        <details className='text-[var(--text-muted)] text-caption'>
          <summary className='cursor-pointer'>{t('test.originalMessage')}</summary>
          <pre className='mt-1 whitespace-pre-wrap break-words'>{message}</pre>
        </details>
      )}
    </div>
  )
}
