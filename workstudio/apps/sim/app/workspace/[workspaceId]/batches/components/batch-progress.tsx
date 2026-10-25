'use client'

import { cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { NexoraBatch } from '@/lib/api/contracts/nexora-batches'

interface BatchProgressProps {
  batch: Pick<NexoraBatch, 'total' | 'completed' | 'failed'>
  className?: string
}

/** A thin bar and « done / total »: requests answered or failed over the batch's requests. */
export function BatchProgress({ batch, className }: BatchProgressProps) {
  const t = useTranslations('batches')
  const done = batch.completed + batch.failed
  const share = batch.total > 0 ? Math.min(100, Math.round((done / batch.total) * 100)) : 0
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className='text-right text-[var(--text-body)] text-small tabular-nums'>
        {t('progress', { done, total: batch.total })}
      </span>
      <div
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        className='h-1 w-full overflow-hidden rounded-full bg-[var(--surface-5)]'
      >
        <div
          className='h-full rounded-full bg-[var(--text-body)] transition-[width]'
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  )
}
