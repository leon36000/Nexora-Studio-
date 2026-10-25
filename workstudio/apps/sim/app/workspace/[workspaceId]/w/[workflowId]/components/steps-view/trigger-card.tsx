'use client'

import { cn, OverflowText } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SampleData } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/sample-data'
import { BlockTile } from '@/blocks/block-tile'

interface TriggerCardProps {
  blockId: string
  blockType: string
  name: string
  inputFormat: unknown
  canEdit: boolean
  selected: boolean
  onSelect: (blockId: string) => void
}

/** The first card: what starts the workflow, and the sample data the test starts it with. */
export function TriggerCard({
  blockId,
  blockType,
  name,
  inputFormat,
  canEdit,
  selected,
  onSelect,
}: TriggerCardProps) {
  const t = useTranslations('steps')
  return (
    <article
      aria-label={t('view.trigger')}
      data-step-card={blockId}
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-[var(--surface-5)] p-3',
        selected ? 'border-[var(--text-muted)]' : 'border-[var(--border)]'
      )}
    >
      <button
        type='button'
        onClick={() => onSelect(blockId)}
        aria-label={`${t('view.open')} — ${name}`}
        className='flex min-w-0 items-center gap-3 text-left'
      >
        <BlockTile blockType={blockType} size='lg' />
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='text-[var(--text-muted)] text-caption'>{t('view.trigger')}</span>
          <OverflowText
            label={t(`triggers.${blockType}`)}
            className='text-[var(--text-primary)] text-small'
          />
        </span>
      </button>
      <div className='flex flex-col gap-2 border-[var(--border)] border-t pt-3'>
        <span className='text-[var(--text-secondary)] text-small'>{t('test.sampleData')}</span>
        <SampleData
          triggerId={blockId}
          triggerType={blockType}
          inputFormat={inputFormat}
          canEdit={canEdit}
        />
      </div>
    </article>
  )
}
