'use client'

import { useState } from 'react'
import { Chip, ChipLink, ChipTag, OverflowText } from '@sim/emcn'
import { HelpCircle, Plus } from '@sim/emcn/icons'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { docsUrl } from '@/lib/branding/docs-url'
import { BatchModal } from '@/app/workspace/[workspaceId]/batches/components/batch-modal'
import { BatchProgress } from '@/app/workspace/[workspaceId]/batches/components/batch-progress'
import { ListState, RowList } from '@/app/workspace/[workspaceId]/evaluations/components/list-state'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useBatches } from '@/hooks/queries/nexora-batches'

interface BatchesProps {
  workspaceId: string
}

/**
 * Nexora edition: long jobs run in the background at low priority. A table's rows go through a
 * model, a prompt or an agent and the answers fill a new column; the batches made with the
 * OpenAI-compatible API (`/v1/batches`) are listed here too.
 */
export function Batches({ workspaceId }: BatchesProps) {
  const t = useTranslations('batches')
  const format = useFormatter()
  const { canEdit } = useUserPermissionsContext()
  const { data: batches, isLoading, isError } = useBatches(workspaceId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <ChipLink
            href={docsUrl('/lots')}
            target='_blank'
            rel='noopener noreferrer'
            leftIcon={HelpCircle}
          >
            {t('help')}
          </ChipLink>
        </header>
        {canEdit && (
          <Chip
            variant='primary'
            leftIcon={Plus}
            className='self-start'
            onClick={() => setIsCreating(true)}
          >
            {t('new')}
          </Chip>
        )}
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!batches?.length}
          errorMessage={t('loadFailed')}
          emptyMessage={t('empty')}
        >
          <RowList>
            {batches?.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/workspace/${workspaceId}/batches/${batch.id}`}
                  className='flex items-center gap-3 px-4 py-3 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none'
                >
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <OverflowText
                      label={batch.name ?? batch.id}
                      focusTarget='nearest-interactive'
                      className='text-[var(--text-body)] text-sm'
                    />
                    <OverflowText
                      label={`${batch.model} · ${t(`sources.${batch.source}`)}`}
                      focusTarget='nearest-interactive'
                      className='text-[var(--text-muted)] text-caption'
                    />
                  </div>
                  <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                    {format.dateTime(new Date(batch.createdAt), {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <BatchProgress batch={batch} className='w-28 shrink-0' />
                  <ChipTag
                    variant='gray'
                    invalid={batch.status === 'failed' || batch.status === 'expired'}
                  >
                    {t(`status.${batch.status}`)}
                  </ChipTag>
                </Link>
              </li>
            ))}
          </RowList>
        </ListState>
        <BatchModal workspaceId={workspaceId} open={isCreating} onOpenChange={setIsCreating} />
      </div>
    </div>
  )
}
