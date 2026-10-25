'use client'

import { Button } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import type { CatalogEntry } from '@/lib/nexora/steps/catalog'
import { StepPicker } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/step-picker'

interface StepConnectorProps {
  canEdit: boolean
  /** Whether the step offered here may be a condition (not inside a branch). */
  allowCondition: boolean
  /** Spell out « Ajouter une étape » rather than only the plus sign. */
  labelled?: boolean
  onPick: (entry: CatalogEntry) => void
  onOpenToolbar: () => void
}

/** The line between two cards, with the button that adds a step right there. */
export function StepConnector({
  canEdit,
  allowCondition,
  labelled = false,
  onPick,
  onOpenToolbar,
}: StepConnectorProps) {
  const t = useTranslations('steps.view')
  return (
    <div className='flex flex-col items-center py-1'>
      <div className='h-3 w-px bg-[var(--border)]' />
      {canEdit && (
        <StepPicker allowCondition={allowCondition} onPick={onPick} onOpenToolbar={onOpenToolbar}>
          <Button
            variant={labelled ? 'default' : 'quiet'}
            size={labelled ? 'md' : 'icon'}
            aria-label={t('addStep')}
          >
            <Plus className='size-[14px]' />
            {labelled && <span className='ml-1.5'>{t('addStep')}</span>}
          </Button>
        </StepPicker>
      )}
      <div className='h-3 w-px bg-[var(--border)]' />
    </div>
  )
}
