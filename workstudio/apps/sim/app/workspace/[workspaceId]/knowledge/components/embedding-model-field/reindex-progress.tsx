'use client'

import { useTranslations } from 'next-intl'
import type { KnowledgeReindexView } from '@/hooks/queries/kb/reindex'

type Reindex = NonNullable<KnowledgeReindexView['reindex']>

const ERROR_KEYS = {
  'model-unavailable': 'modelUnavailable',
  'chunk-too-long': 'chunkTooLong',
  failed: 'failed',
} as const

/** `ollama/nomic-embed-text:latest` reads as `nomic-embed-text:latest`. */
export function embeddingModelLabel(model: string): string {
  return model.replace(/^ollama\//, '')
}

interface ReindexProgressProps {
  reindex: Reindex
}

/** Where a base's reindex stands: progress while it runs, a stall, or why the last one failed. */
export function ReindexProgress({ reindex }: ReindexProgressProps) {
  const t = useTranslations('knowledge.reindex')
  const model = embeddingModelLabel(reindex.targetModel)

  if (reindex.status === 'failed') {
    const reason = t(`errors.${ERROR_KEYS[reindex.errorCode ?? 'failed']}`)
    return <p className='text-[var(--text-error)] text-caption'>{t('failed', { model, reason })}</p>
  }
  if (reindex.status !== 'running') return null
  if (reindex.stalled) {
    return <p className='text-[var(--text-error)] text-caption'>{t('stalled', { model })}</p>
  }

  const percent =
    reindex.totalChunks > 0
      ? Math.min(100, Math.floor((reindex.embeddedChunks * 100) / reindex.totalChunks))
      : 0
  return (
    <div className='flex flex-col gap-1.5' role='status'>
      <p className='text-[var(--text-primary)] text-caption'>
        {t('running', {
          model,
          percent,
          done: reindex.embeddedChunks,
          total: reindex.totalChunks,
        })}
      </p>
      <div className='h-1 w-full overflow-hidden rounded-full bg-[var(--surface-4)]'>
        <div
          className='h-full rounded-full bg-[var(--text-primary)] transition-[width]'
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className='text-[var(--text-tertiary)] text-caption'>{t('runningNote')}</p>
    </div>
  )
}
