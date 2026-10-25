'use client'

import { Fragment, useMemo, useState } from 'react'
import { Banner, Button, ChipConfirmModal, toast } from '@sim/emcn'
import { Loader, Play } from '@sim/emcn/icons'
import type { BlockState } from '@sim/workflow-types/workflow'
import { useTranslations } from 'next-intl'
import { catalogEntryOf, isTriggerType } from '@/lib/nexora/steps/catalog'
import type { InsertPoint } from '@/lib/nexora/steps/edit'
import type { StepNode, StepsRefusal, StepsReading } from '@/lib/nexora/steps/read'
import { stepResultsFrom } from '@/lib/nexora/steps/results'
import { StepCard } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/step-card'
import { StepConnector } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/step-connector'
import { TriggerCard } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/trigger-card'
import { useStepsActions } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/steps-view/hooks/use-steps-actions'
import { useWorkflowExecution } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks/use-workflow-execution'
import { usePanelEditorStore } from '@/stores/panel'
import { useWorkflowConsoleEntries } from '@/stores/terminal'

interface StepsViewProps {
  workflowId: string
  reading: StepsReading
  /** The blocks with their current values. */
  blocks: Record<string, BlockState>
  canEdit: boolean
  onOpenCanvas: () => void
  onOpenToolbar: () => void
}

interface PendingRemoval {
  blockId: string
  count: number
}

/**
 * The workflow as a vertical list of cards: trigger, steps, and the two branches of each condition.
 * It reads and edits the live workflow (nothing is copied), so the canvas shows every change; when
 * the shape is not one the view can rewrite safely, it lists the blocks read-only with a way out
 * to the canvas.
 */
export function StepsView({
  workflowId,
  reading,
  blocks,
  canEdit,
  onOpenCanvas,
  onOpenToolbar,
}: StepsViewProps) {
  const t = useTranslations('steps')
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const selectedId = usePanelEditorStore((state) => state.currentBlockId)
  const entries = useWorkflowConsoleEntries(workflowId)
  const results = useMemo(() => stepResultsFrom(entries), [entries])
  const { handleRunWorkflow, handleRunUntilBlock, handleCancelExecution, isExecuting } =
    useWorkflowExecution()
  const actions = useStepsActions({
    onFailure: () => toast({ message: t('view.editFailed') }),
    onAgentNotReady: () => toast({ message: t('view.agentNotReady') }),
  })

  const editable = canEdit && reading.recognized
  const insertAt = (point: InsertPoint) => (entry: { id: string }) => actions.insert(point, entry.id)

  const requestRemoval = (blockId: string, count: number) => {
    if (count > 0) setPendingRemoval({ blockId, count })
    else actions.remove(blockId)
  }

  const renderCard = (
    node: Pick<StepNode, 'blockId' | 'name' | 'blockType'> & { entryId: string | null },
    number: number | null,
    position: { index: number; length: number; removalCount: number }
  ) => {
    const block = blocks[node.blockId]
    return (
      <StepCard
        blockId={node.blockId}
        blockType={node.blockType}
        name={node.name}
        entryId={node.entryId}
        block={block ?? { type: node.blockType }}
        number={number}
        selected={selectedId === node.blockId}
        result={results.get(node.blockId)}
        canEdit={editable}
        canMoveUp={position.index > 0}
        canMoveDown={position.index < position.length - 1}
        removalCount={position.removalCount}
        testDisabled={isExecuting}
        onSelect={actions.select}
        onMove={actions.move}
        onRemove={requestRemoval}
        onTestUntil={(blockId) => void handleRunUntilBlock(blockId, workflowId)}
      />
    )
  }

  const renderTrigger = (blockId: string, blockType: string, name: string) => (
    <TriggerCard
      blockId={blockId}
      blockType={blockType}
      name={name}
      inputFormat={blocks[blockId]?.subBlocks?.inputFormat?.value}
      canEdit={canEdit}
      selected={selectedId === blockId}
      onSelect={actions.select}
    />
  )

  const connector = (point: InsertPoint, allowCondition: boolean, labelled = false) => (
    <StepConnector
      canEdit={editable}
      allowCondition={allowCondition}
      labelled={labelled}
      onPick={insertAt(point)}
      onOpenToolbar={onOpenToolbar}
    />
  )

  const renderRecognized = (document: Extract<StepsReading, { recognized: true }>['document']) => (
    <>
      {renderTrigger(document.trigger.blockId, document.trigger.type, document.trigger.name)}
      {connector({ after: document.trigger.blockId }, true, document.steps.length === 0)}
      {document.steps.map((step, index) => (
        <Fragment key={step.blockId}>
          {renderCard(step, index + 1, {
            index,
            length: document.steps.length,
            removalCount: step.branches ? step.branches.if.length + step.branches.else.length : 0,
          })}
          {step.branches && (
            <div className='ml-6 flex flex-col gap-1 border-[var(--border)] border-l pl-4'>
              {(['if', 'else'] as const).map((side) => {
                const members = step.branches?.[side] ?? []
                return (
                  <section key={side} aria-label={t(side === 'if' ? 'view.branchIf' : 'view.branchElse')}>
                    <span className='text-[var(--text-secondary)] text-small'>
                      {t(side === 'if' ? 'view.branchIf' : 'view.branchElse')}
                    </span>
                    {members.length === 0 && (
                      <p className='text-[var(--text-muted)] text-caption'>{t('view.emptyBranch')}</p>
                    )}
                    {connector({ branch: { condition: step.blockId, side } }, false)}
                    {members.map((member, memberIndex) => (
                      <Fragment key={member.blockId}>
                        {renderCard(member, null, {
                          index: memberIndex,
                          length: members.length,
                          removalCount: 0,
                        })}
                        {connector({ after: member.blockId }, false)}
                      </Fragment>
                    ))}
                  </section>
                )
              })}
            </div>
          )}
          {connector({ after: step.blockId }, true, index === document.steps.length - 1)}
        </Fragment>
      ))}
    </>
  )

  const renderReadOnly = (order: string[]) => (
    <>
      {order.map((blockId, index) => {
        const block = blocks[blockId]
        if (!block) return null
        if (isTriggerType(block.type)) {
          return <Fragment key={blockId}>{renderTrigger(blockId, block.type, block.name)}</Fragment>
        }
        const entry = catalogEntryOf({ type: block.type, subBlocks: block.subBlocks })
        return (
          <Fragment key={blockId}>
            <div className='h-3 w-px self-center bg-[var(--border)]' />
            {renderCard({ blockId, name: block.name, blockType: block.type, entryId: entry?.id ?? null }, index, {
              index,
              length: order.length,
              removalCount: 0,
            })}
          </Fragment>
        )
      })}
    </>
  )

  return (
    <div className='flex flex-col gap-0 pb-24'>
      <div className='flex items-center justify-between gap-3 pb-4'>
        <h2 className='text-[var(--text-primary)] text-md'>{t('view.title')}</h2>
        {isExecuting ? (
          <Button variant='default' onClick={() => void handleCancelExecution()}>
            <Loader className='mr-1.5 size-[14px]' animate />
            {t('test.cancel')}
          </Button>
        ) : (
          <Button variant='primary' onClick={() => void handleRunWorkflow()}>
            <Play className='mr-1.5 size-[14px]' />
            {t('test.run')}
          </Button>
        )}
      </div>
      {!reading.recognized && (
        <div className='mb-4 flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3'>
          <Banner
            text={
              <>
                <strong>{t('view.readOnly.title')}</strong> {t('view.readOnly.body')}
              </>
            }
            actionLabel={t('view.readOnly.openCanvas')}
            onAction={onOpenCanvas}
          />
          <ul className='list-disc pl-5 text-[var(--text-muted)] text-caption'>
            {reading.reasons.map((reason: StepsRefusal) => (
              <li key={reason}>{t(`view.refusal.${reason}`)}</li>
            ))}
          </ul>
        </div>
      )}
      {reading.recognized ? renderRecognized(reading.document) : renderReadOnly(reading.order)}
      <ChipConfirmModal
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={t('view.remove')}
        text={pendingRemoval ? t('view.removeConfirm', { count: pendingRemoval.count }) : ''}
        dismissLabel={t('view.cancel')}
        confirm={{
          label: t('view.remove'),
          onClick: () => {
            if (pendingRemoval) actions.remove(pendingRemoval.blockId)
            setPendingRemoval(null)
          },
        }}
      />
    </div>
  )
}
