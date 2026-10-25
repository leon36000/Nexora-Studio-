import { useCallback } from 'react'
import { createLogger } from '@sim/logger'
import { generateId } from '@sim/utils/id'
import type { Edge } from '@xyflow/react'
import { catalogEntryById } from '@/lib/nexora/steps/catalog'
import {
  type InsertPoint,
  planInsert,
  planMove,
  planRemove,
  type StepsPatch,
  type StepsState,
} from '@/lib/nexora/steps/edit'
import { getDefaultBlockName } from '@/lib/workflows/blocks/canvas-presentation'
import { getBlock } from '@/blocks'
import { useCollaborativeWorkflow } from '@/hooks/use-collaborative-workflow'
import { useOperationAccess } from '@/hooks/use-operation-access'
import { usePanelEditorStore, usePanelStore } from '@/stores/panel'
import { prepareBlockState } from '@/stores/workflows/prepare-block-state'
import { getUniqueBlockName } from '@/stores/workflows/utils'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

const logger = createLogger('StepsActions')

interface UseStepsActionsProps {
  /** Shown when a change cannot be made (the view's `editFailed` message). */
  onFailure: () => void
  /** Shown when the AI model is not ready yet (the editor's own message). */
  onAgentNotReady: () => void
}

/** The workflow as the pure edits read it. */
function currentState(): StepsState {
  const { blocks, edges, loops, parallels } = useWorkflowStore.getState()
  // double-cast-allowed: the store's block states carry the fields the edits read, plus their own
  return { blocks, edges, loops, parallels } as unknown as StepsState
}

/**
 * The Steps view's changes to the workflow. Each edit is planned by the pure functions of
 * `lib/nexora/steps/edit`, then applied through the same collaborative operations as the canvas, so
 * other people editing the workflow see them and nothing but the touched edges and positions moves.
 */
export function useStepsActions({ onFailure, onAgentNotReady }: UseStepsActionsProps) {
  const {
    collaborativeBatchAddBlocks,
    collaborativeBatchRemoveBlocks,
    collaborativeBatchAddEdges,
    collaborativeBatchRemoveEdges,
    collaborativeBatchUpdatePositions,
  } = useCollaborativeWorkflow()
  const { resolveSeedGate, agentDefaultModel, isAgentDefaultReady, refetchModelSettings } =
    useOperationAccess()

  const applyEdgesAndPositions = useCallback(
    (patch: StepsPatch) => {
      const existing = new Set(useWorkflowStore.getState().edges.map((edge) => edge.id))
      collaborativeBatchRemoveEdges(patch.removeEdgeIds.filter((id) => existing.has(id)))
      const edges: Edge[] = patch.addEdges.map((edge) => ({ ...edge }))
      collaborativeBatchAddEdges(edges)
      const moves = Object.entries(patch.positions)
        .filter(([id]) => id in useWorkflowStore.getState().blocks)
        .map(([id, position]) => ({ id, position }))
      if (moves.length > 0) collaborativeBatchUpdatePositions(moves)
    },
    [collaborativeBatchRemoveEdges, collaborativeBatchAddEdges, collaborativeBatchUpdatePositions]
  )

  const select = useCallback((blockId: string) => {
    usePanelEditorStore.getState().setCurrentBlockId(blockId)
    usePanelStore.getState().setActiveTab('editor')
  }, [])

  const insert = useCallback(
    (point: InsertPoint, entryId: string) => {
      const entry = catalogEntryById(entryId)
      const config = entry ? getBlock(entry.blockType) : undefined
      if (!entry || !config) return onFailure()
      if (entry.blockType === 'agent' && !isAgentDefaultReady) {
        void refetchModelSettings({ cancelRefetch: false })
        return onAgentNotReady()
      }
      const state = currentState()
      const blockId = generateId()
      const name = getUniqueBlockName(
        getDefaultBlockName(config),
        useWorkflowStore.getState().blocks
      )
      try {
        const patch = planInsert(state, point, entry, { blockId, name })
        const block = prepareBlockState({
          id: blockId,
          type: entry.blockType,
          name,
          position: patch.positions[blockId] ?? { x: 0, y: 0 },
          data: {},
          isSeededValueAllowed: resolveSeedGate(config),
          agentDefaultModel,
        })
        const subBlockValues: Record<string, Record<string, unknown>> = { [blockId]: {} }
        for (const [id, subBlock] of Object.entries(block.subBlocks)) {
          if (subBlock.value !== null && subBlock.value !== undefined) {
            subBlockValues[blockId][id] = subBlock.value
          }
        }
        Object.assign(subBlockValues[blockId], entry.preset)
        collaborativeBatchRemoveEdges(patch.removeEdgeIds)
        collaborativeBatchAddBlocks([block], patch.addEdges, {}, {}, subBlockValues)
        applyEdgesAndPositions({ ...patch, removeEdgeIds: [], addEdges: [] })
        select(blockId)
      } catch (error) {
        logger.error('Could not insert a step', { error })
        onFailure()
      }
    },
    [
      onFailure,
      onAgentNotReady,
      isAgentDefaultReady,
      refetchModelSettings,
      resolveSeedGate,
      agentDefaultModel,
      collaborativeBatchRemoveEdges,
      collaborativeBatchAddBlocks,
      applyEdgesAndPositions,
      select,
    ]
  )

  const remove = useCallback(
    (blockId: string) => {
      try {
        const patch = planRemove(currentState(), blockId)
        collaborativeBatchRemoveBlocks(patch.removeBlockIds)
        applyEdgesAndPositions(patch)
        usePanelEditorStore.getState().clearCurrentBlock()
      } catch (error) {
        logger.error('Could not remove a step', { error })
        onFailure()
      }
    },
    [collaborativeBatchRemoveBlocks, applyEdgesAndPositions, onFailure]
  )

  const move = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      try {
        const patch = planMove(currentState(), blockId, direction)
        if (patch) applyEdgesAndPositions(patch)
      } catch (error) {
        logger.error('Could not move a step', { error })
        onFailure()
      }
    },
    [applyEdgesAndPositions, onFailure]
  )

  return { insert, remove, move, select }
}
