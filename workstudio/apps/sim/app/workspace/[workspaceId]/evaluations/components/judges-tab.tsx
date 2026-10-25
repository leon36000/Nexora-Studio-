'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, OverflowText, toast } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { NexoraEvalJudge } from '@/lib/api/contracts/nexora-evaluations'
import { JudgeModal } from '@/app/workspace/[workspaceId]/evaluations/components/judge-modal'
import { ListState, RowList } from '@/app/workspace/[workspaceId]/evaluations/components/list-state'
import { judgeModel } from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useDeleteEvalJudge, useEvalJudges } from '@/hooks/queries/nexora-evaluations'

interface JudgesTabProps {
  workspaceId: string
}

/** The workspace's judges: LLMs that classify or grade, and rules. */
export function JudgesTab({ workspaceId }: JudgesTabProps) {
  const t = useTranslations('evaluations')
  const { canEdit } = useUserPermissionsContext()
  const { data: judges, isLoading, isError } = useEvalJudges(workspaceId)
  const { mutateAsync: deleteJudge, isPending: isDeleting } = useDeleteEvalJudge()
  const [editing, setEditing] = useState<NexoraEvalJudge | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<NexoraEvalJudge | null>(null)

  const openModal = (judge: NexoraEvalJudge | null) => {
    setEditing(judge)
    setIsModalOpen(true)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteJudge({ workspaceId, judgeId: pendingDelete.id })
      setPendingDelete(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('judges.deleteFailed')))
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      {canEdit && (
        <Chip
          variant='primary'
          leftIcon={Plus}
          className='self-start'
          onClick={() => openModal(null)}
        >
          {t('judges.new')}
        </Chip>
      )}
      <ListState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!judges?.length}
        errorMessage={t('judges.loadFailed')}
        emptyMessage={t('judges.empty')}
      >
        <RowList>
          {judges?.map((judge) => (
            <li key={judge.id} className='flex items-center gap-3 px-4 py-3'>
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <OverflowText label={judge.name} className='text-[var(--text-body)] text-sm' />
                <span className='text-[var(--text-muted)] text-caption'>
                  {t(`judgeModal.kinds.${judge.config.kind}`)}
                  {judgeModel(judge.config) ? ` · ${judgeModel(judge.config)}` : ''}
                </span>
              </div>
              {canEdit && (
                <div className='flex shrink-0 items-center gap-1'>
                  <Chip onClick={() => openModal(judge)}>{t('judges.edit')}</Chip>
                  <Chip disabled={isDeleting} onClick={() => setPendingDelete(judge)}>
                    {t('judges.delete')}
                  </Chip>
                </div>
              )}
            </li>
          ))}
        </RowList>
      </ListState>
      <JudgeModal
        workspaceId={workspaceId}
        judge={editing}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
      <ChipConfirmModal
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null)
        }}
        title={t('judges.deleteTitle', { name: pendingDelete?.name ?? '' })}
        text={t('judges.deleteText')}
        dismissLabel={t('cancel')}
        confirm={{
          label: t('judges.delete'),
          variant: 'destructive',
          pending: isDeleting,
          disabled: isDeleting,
          onClick: () => void handleDelete(),
        }}
      />
    </div>
  )
}
