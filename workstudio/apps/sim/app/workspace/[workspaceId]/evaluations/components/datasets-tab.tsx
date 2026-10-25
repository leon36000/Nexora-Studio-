'use client'

import { useState } from 'react'
import { Chip, OverflowText } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { DatasetModal } from '@/app/workspace/[workspaceId]/evaluations/components/dataset-modal'
import { ListState, RowList } from '@/app/workspace/[workspaceId]/evaluations/components/list-state'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useEvalDatasets } from '@/hooks/queries/nexora-evaluations'

interface DatasetsTabProps {
  workspaceId: string
}

/** The workspace's test sets: questions, expected answers and the annotations a judge is checked against. */
export function DatasetsTab({ workspaceId }: DatasetsTabProps) {
  const t = useTranslations('evaluations')
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data: datasets, isLoading, isError } = useEvalDatasets(workspaceId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className='flex flex-col gap-4'>
      {canEdit && (
        <Chip
          variant='primary'
          leftIcon={Plus}
          className='self-start'
          onClick={() => setIsCreating(true)}
        >
          {t('datasets.new')}
        </Chip>
      )}
      <ListState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!datasets?.length}
        errorMessage={t('datasets.loadFailed')}
        emptyMessage={t('datasets.empty')}
      >
        <RowList>
          {datasets?.map((dataset) => (
            <li key={dataset.id}>
              <Link
                href={`/workspace/${workspaceId}/evaluations/datasets/${dataset.id}`}
                className='flex items-center gap-3 px-4 py-3 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none'
              >
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <OverflowText
                    label={dataset.name}
                    focusTarget='nearest-interactive'
                    className='text-[var(--text-body)] text-sm'
                  />
                  {dataset.description && (
                    <OverflowText
                      label={dataset.description}
                      focusTarget='nearest-interactive'
                      className='text-[var(--text-muted)] text-caption'
                    />
                  )}
                </div>
                <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                  {t('datasets.summary', {
                    rows: dataset.rowCount,
                    annotated: dataset.annotatedCount,
                  })}
                </span>
              </Link>
            </li>
          ))}
        </RowList>
      </ListState>
      <DatasetModal
        workspaceId={workspaceId}
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={(datasetId) =>
          router.push(`/workspace/${workspaceId}/evaluations/datasets/${datasetId}`)
        }
      />
    </div>
  )
}
