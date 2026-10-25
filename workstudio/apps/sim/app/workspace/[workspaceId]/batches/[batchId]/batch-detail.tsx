'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, ChipLink, ChipTag, OverflowText, toast } from '@sim/emcn'
import { ArrowLeft, Download, Loader } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { BatchProgress } from '@/app/workspace/[workspaceId]/batches/components/batch-progress'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { formatDuration } from '@/app/workspace/[workspaceId]/traces/utils/span-tree'
import {
  BATCH_RESULTS_SHOWN,
  useBatch,
  useCancelBatch,
  useDeleteBatch,
} from '@/hooks/queries/nexora-batches'

interface BatchDetailProps {
  workspaceId: string
  batchId: string
}

/** Nexora edition: one batch — progress, the column it fills, cancellation, CSV export and its first results. */
export function BatchDetail({ workspaceId, batchId }: BatchDetailProps) {
  const t = useTranslations('batches.detail')
  const tStatus = useTranslations('batches.status')
  const tSources = useTranslations('batches.sources')
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data, isLoading, isError } = useBatch(workspaceId, batchId)
  const { mutateAsync: cancelBatch, isPending: isCancelling } = useCancelBatch()
  const { mutateAsync: deleteBatch, isPending: isDeleting } = useDeleteBatch()
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const back = (
    <ChipLink
      href={`/workspace/${workspaceId}/batches`}
      leftIcon={ArrowLeft}
      className='self-start'
    >
      {t('back')}
    </ChipLink>
  )

  if (isLoading || isError || !data) {
    return (
      <div className='min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
          {back}
          {isLoading ? (
            <Loader className='size-[16px] text-[var(--text-muted)]' animate />
          ) : (
            <p className='text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
          )}
        </div>
      </div>
    )
  }

  const { batch, results } = data
  const isActive = batch.status === 'in_progress' || batch.status === 'cancelling'
  const exportHref = `/api/nexora/batches/${batch.id}/export?workspaceId=${encodeURIComponent(workspaceId)}`

  const handleConfirm = async () => {
    try {
      if (confirm === 'cancel') await cancelBatch({ workspaceId, batchId })
      if (confirm === 'delete') {
        await deleteBatch({ workspaceId, batchId })
        router.push(`/workspace/${workspaceId}/batches`)
      }
      setConfirm(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('actionFailed')))
    }
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-3'>
          {back}
          <div className='flex items-center justify-between gap-4'>
            <div className='flex min-w-0 items-center gap-2'>
              <OverflowText
                label={batch.name ?? batch.id}
                className='font-medium text-[var(--text-body)] text-lg'
              />
              <ChipTag
                variant='gray'
                invalid={batch.status === 'failed' || batch.status === 'expired'}
              >
                {tStatus(batch.status)}
              </ChipTag>
            </div>
            <div className='flex shrink-0 items-center gap-1'>
              <ChipLink href={exportHref} leftIcon={Download}>
                {t('export')}
              </ChipLink>
              {batch.tableId && (
                <ChipLink href={`/workspace/${workspaceId}/tables/${batch.tableId}`}>
                  {t('openTable')}
                </ChipLink>
              )}
              {canEdit && (
                <Chip
                  disabled={isCancelling || isDeleting || batch.status === 'cancelling'}
                  onClick={() => setConfirm(isActive ? 'cancel' : 'delete')}
                >
                  {isActive ? t('cancel') : t('delete')}
                </Chip>
              )}
            </div>
          </div>
          <p className='text-[var(--text-muted)] text-small'>
            {t('context', {
              model: batch.model,
              source: tSources(batch.source),
              concurrency: batch.concurrency,
            })}
            {batch.outputColumnName ? ` · ${t('column', { column: batch.outputColumnName })}` : ''}
          </p>
          <BatchProgress batch={batch} className='max-w-sm' />
          <p className='text-[var(--text-body)] text-small'>
            {t('progress', { done: batch.completed + batch.failed, total: batch.total })}
            {batch.failed > 0 ? ` · ${t('failedCount', { count: batch.failed })}` : ''}
            {batch.skipped > 0 ? ` · ${t('skipped', { count: batch.skipped })}` : ''}
            {batch.startedAt
              ? ` · ${t('started', {
                  date: format.dateTime(new Date(batch.startedAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }),
                })}`
              : ''}
            {batch.startedAt && batch.finishedAt
              ? ` · ${t('duration', {
                  value: formatDuration(
                    new Date(batch.finishedAt).getTime() - new Date(batch.startedAt).getTime(),
                    locale
                  ),
                })}`
              : ''}
            {isActive
              ? ` · ${t('expires', {
                  date: format.dateTime(new Date(batch.expiresAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }),
                })}`
              : ''}
          </p>
          {batch.promptTokens + batch.completionTokens > 0 && (
            <p className='text-[var(--text-muted)] text-caption'>
              {t('tokens', {
                prompt: format.number(batch.promptTokens),
                completion: format.number(batch.completionTokens),
              })}
            </p>
          )}
        </header>

        {batch.errors && batch.errors.length > 0 && (
          <section className='flex flex-col gap-2'>
            <h2 className='text-[var(--text-muted)] text-small'>{t('errorsTitle')}</h2>
            <ul className='flex flex-col gap-1 text-[var(--text-error)] text-small'>
              {batch.errors.map((problem) => (
                <li key={`${problem.code}-${problem.message}`}>{problem.message}</li>
              ))}
            </ul>
          </section>
        )}

        <section className='flex flex-col gap-2'>
          <h2 className='text-[var(--text-muted)] text-small'>{t('resultsTitle')}</h2>
          {results.length === 0 ? (
            <p className='text-[var(--text-muted)] text-small'>{t('noResults')}</p>
          ) : (
            <>
              <div className='overflow-x-auto rounded-lg border border-[var(--border)]'>
                <table className='w-full text-left text-small'>
                  <thead className='text-[var(--text-muted)]'>
                    <tr className='border-[var(--border)] border-b'>
                      <th className='w-16 px-3 py-2 font-normal'>{t('columns.line')}</th>
                      <th className='px-3 py-2 font-normal'>{t('columns.input')}</th>
                      <th className='px-3 py-2 font-normal'>{t('columns.answer')}</th>
                      <th className='w-28 px-3 py-2 font-normal'>{t('columns.status')}</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[var(--border)]'>
                    {results.map((result) => (
                      <tr key={result.position} className='align-top'>
                        <td className='px-3 py-2 text-[var(--text-muted)] tabular-nums'>
                          {result.position + 1}
                        </td>
                        <td className='max-w-[22rem] px-3 py-2 text-[var(--text-body)]'>
                          <span className='line-clamp-3 whitespace-pre-wrap break-words'>
                            {result.input ?? result.customId}
                          </span>
                        </td>
                        <td className='max-w-[22rem] px-3 py-2 text-[var(--text-body)]'>
                          <span className='line-clamp-3 whitespace-pre-wrap break-words'>
                            {result.error ? (
                              <span className='text-[var(--text-error)]'>{result.error}</span>
                            ) : (
                              result.answer
                            )}
                          </span>
                        </td>
                        <td className='px-3 py-2'>
                          <ChipTag variant='gray' invalid={result.status === 'error'}>
                            {tStatus(result.status)}
                          </ChipTag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {batch.total > results.length && (
                <p className='text-[var(--text-muted)] text-caption'>
                  {t('resultsNote', { count: BATCH_RESULTS_SHOWN })}
                </p>
              )}
            </>
          )}
        </section>

        <ChipConfirmModal
          open={confirm !== null}
          onOpenChange={(open) => {
            if (!open && !isCancelling && !isDeleting) setConfirm(null)
          }}
          title={confirm === 'cancel' ? t('confirmCancelTitle') : t('confirmDeleteTitle')}
          text={confirm === 'cancel' ? t('confirmCancelBody') : t('confirmDeleteBody')}
          dismissLabel={t('keep')}
          confirm={{
            label: confirm === 'cancel' ? t('confirmCancel') : t('confirmDelete'),
            variant: 'destructive',
            pending: isCancelling || isDeleting,
            disabled: isCancelling || isDeleting,
            onClick: () => void handleConfirm(),
          }}
        />
      </div>
    </div>
  )
}
