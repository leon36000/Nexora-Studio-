'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, ChipLink, ChipTag, OverflowText, toast } from '@sim/emcn'
import { ArrowLeft, Loader, Plus } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { NexoraEvalRow } from '@/lib/api/contracts/nexora-evaluations'
import { RowModal } from '@/app/workspace/[workspaceId]/evaluations/components/row-modal'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import {
  useDeleteEvalDataset,
  useDeleteEvalRow,
  useEvalDataset,
} from '@/hooks/queries/nexora-evaluations'

interface DatasetDetailProps {
  workspaceId: string
  datasetId: string
}

const PAGE_SIZE = 200

/** Nexora edition: one test set — its rows, with the expected answers and the human annotations. */
export function DatasetDetail({ workspaceId, datasetId }: DatasetDetailProps) {
  const t = useTranslations('evaluations.dataset')
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const [offset, setOffset] = useState(0)
  const { data, isLoading, isError } = useEvalDataset(workspaceId, datasetId, offset)
  const { mutateAsync: deleteDataset, isPending: isDeleting } = useDeleteEvalDataset()
  const { mutateAsync: deleteRow } = useDeleteEvalRow()
  const [editing, setEditing] = useState<NexoraEvalRow | null>(null)
  const [isRowOpen, setIsRowOpen] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const back = (
    <ChipLink
      href={`/workspace/${workspaceId}/evaluations?tab=datasets`}
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

  const { dataset, rows } = data

  const openRow = (row: NexoraEvalRow | null) => {
    setEditing(row)
    setIsRowOpen(true)
  }

  const handleDeleteRow = async (rowId: string) => {
    try {
      await deleteRow({ workspaceId, datasetId, rowId })
    } catch (error) {
      toast.error(getErrorMessage(error, t('deleteRowFailed')))
    }
  }

  const handleDeleteDataset = async () => {
    try {
      await deleteDataset({ workspaceId, datasetId })
      router.push(`/workspace/${workspaceId}/evaluations?tab=datasets`)
    } catch (error) {
      setIsConfirmingDelete(false)
      toast.error(getErrorMessage(error, t('deleteFailed')))
    }
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <header className='flex flex-col gap-3'>
          {back}
          <div className='flex items-center justify-between gap-4'>
            <OverflowText
              label={dataset.name}
              className='font-medium text-[var(--text-body)] text-lg'
            />
            {canEdit && (
              <div className='flex shrink-0 items-center gap-1'>
                <Chip variant='primary' leftIcon={Plus} onClick={() => openRow(null)}>
                  {t('addRow')}
                </Chip>
                <Chip disabled={isDeleting} onClick={() => setIsConfirmingDelete(true)}>
                  {t('delete')}
                </Chip>
              </div>
            )}
          </div>
          {dataset.description && (
            <p className='text-[var(--text-muted)] text-small'>{dataset.description}</p>
          )}
          <p className='text-[var(--text-muted)] text-caption'>
            {t('summary', {
              rows: dataset.rowCount,
              annotated: dataset.annotatedCount,
              source: t(`sources.${dataset.source}`),
            })}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className='text-[var(--text-muted)] text-small'>{t('empty')}</p>
        ) : (
          <div className='overflow-x-auto rounded-lg border border-[var(--border)]'>
            <table className='w-full min-w-[44rem] table-fixed text-left text-small'>
              <thead className='text-[var(--text-muted)] text-caption'>
                <tr className='border-[var(--border)] border-b'>
                  <th className='w-[30%] px-3 py-2 font-normal'>{t('input')}</th>
                  <th className='w-[22%] px-3 py-2 font-normal'>{t('expected')}</th>
                  <th className='px-3 py-2 font-normal'>{t('annotation')}</th>
                  {canEdit && <th className='w-24 px-3 py-2 font-normal'>{null}</th>}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--border)] align-top text-[var(--text-body)]'>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className='px-3 py-2'>
                      <p className='line-clamp-3'>{row.input}</p>
                    </td>
                    <td className='px-3 py-2'>
                      <p className='line-clamp-3'>{row.expected ?? '—'}</p>
                    </td>
                    <td className='px-3 py-2'>
                      {row.candidate ? (
                        <div className='flex flex-col gap-1'>
                          <p className='line-clamp-2 text-caption'>{row.candidate}</p>
                          {row.humanVerdict && (
                            <ChipTag
                              variant='gray'
                              invalid={row.humanVerdict === 'fail'}
                              className='self-start'
                            >
                              {t(`verdicts.${row.humanVerdict}`)}
                            </ChipTag>
                          )}
                          {row.humanNote && (
                            <p className='line-clamp-2 text-[var(--text-muted)] text-caption'>
                              {row.humanNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className='text-[var(--text-muted)]'>—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className='px-3 py-2'>
                        <div className='flex flex-col items-start gap-1'>
                          <Chip onClick={() => openRow(row)}>{t('edit')}</Chip>
                          <Chip onClick={() => void handleDeleteRow(row.id)}>{t('deleteRow')}</Chip>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(offset > 0 || dataset.rowCount > offset + PAGE_SIZE) && (
          <div className='flex items-center gap-1'>
            <Chip
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              {t('previous')}
            </Chip>
            <span className='text-[var(--text-muted)] text-caption'>
              {t('page', {
                from: offset + 1,
                to: Math.min(offset + PAGE_SIZE, dataset.rowCount),
                total: dataset.rowCount,
              })}
            </span>
            <Chip
              disabled={dataset.rowCount <= offset + PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              {t('next')}
            </Chip>
          </div>
        )}
      </div>
      <RowModal
        workspaceId={workspaceId}
        datasetId={datasetId}
        row={editing}
        open={isRowOpen}
        onOpenChange={setIsRowOpen}
      />
      <ChipConfirmModal
        open={isConfirmingDelete}
        onOpenChange={(open) => {
          if (!isDeleting) setIsConfirmingDelete(open)
        }}
        title={t('deleteTitle', { name: dataset.name })}
        text={t('deleteText')}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('delete'),
          variant: 'destructive',
          pending: isDeleting,
          disabled: isDeleting,
          onClick: () => void handleDeleteDataset(),
        }}
      />
    </div>
  )
}
