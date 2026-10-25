'use client'

import { Chip } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { useStepsModel } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/hooks/use-steps-model'
import { StepsView } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/steps-view'
import { usePanelStore } from '@/stores/panel'

interface StepsLayerProps {
  workflowId: string
  canEdit: boolean
}

/**
 * The switch between the Steps view and the canvas, and the Steps view laid over the canvas when
 * it is the chosen view. The canvas stays mounted underneath, so going back to it is immediate and
 * nothing it holds (loading, collaboration, execution) is rebuilt.
 */
export function StepsLayer({ workflowId, canEdit }: StepsLayerProps) {
  const t = useTranslations('steps.view')
  const { reading, blocks, mode, setMode } = useStepsModel(workflowId)

  const openToolbar = () => {
    usePanelStore.getState().setActiveTab('toolbar')
    setMode('canvas')
  }

  return (
    <>
      <div
        role='group'
        aria-label={t('mode.label')}
        className='absolute top-3 left-3 z-[30] flex gap-1'
      >
        <Chip active={mode === 'steps'} onClick={() => setMode('steps')}>
          {t('mode.steps')}
        </Chip>
        <Chip active={mode === 'canvas'} onClick={() => setMode('canvas')}>
          {t('mode.advanced')}
        </Chip>
      </div>
      {mode === 'steps' && (
        <div data-steps-view className='absolute inset-0 z-[20] overflow-y-auto bg-[var(--bg)]'>
          <div className='mx-auto w-full max-w-[720px] px-4 pt-16'>
            <StepsView
              workflowId={workflowId}
              reading={reading}
              blocks={blocks}
              canEdit={canEdit}
              onOpenCanvas={() => setMode('canvas')}
              onOpenToolbar={openToolbar}
            />
          </div>
        </div>
      )}
    </>
  )
}
