import { useMemo } from 'react'
import { mergeSubblockStateWithValues } from '@sim/workflow-persistence/subblocks'
import { hasStepsMarker, resolveEditorMode } from '@/lib/nexora/steps/mode'
import { readSteps, type StepsReading } from '@/lib/nexora/steps/read'
import { useSubBlockStore } from '@/stores/workflows/subblock/store'
import { useEditorViewStore } from '@/stores/workflows/view-mode/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

/**
 * What the Steps view shows and which view the workflow opens in: the live blocks and edges read as
 * steps, the blocks with their current values (the structure's own values are stale after an edit),
 * and the mode the person chose or, failing that, the workflow's default.
 */
export function useStepsModel(workflowId: string) {
  const blocks = useWorkflowStore((state) => state.blocks)
  const edges = useWorkflowStore((state) => state.edges)
  const loops = useWorkflowStore((state) => state.loops)
  const parallels = useWorkflowStore((state) => state.parallels)
  const values = useSubBlockStore((state) => state.workflowValues[workflowId])
  const preference = useEditorViewStore((state) => state.preferences[workflowId] ?? null)
  const setPreference = useEditorViewStore((state) => state.setPreference)

  const reading: StepsReading = useMemo(
    () => readSteps({ blocks, edges, loops, parallels }),
    [blocks, edges, loops, parallels]
  )
  const marked = useMemo(() => hasStepsMarker({ blocks }), [blocks])
  const current = useMemo(() => mergeSubblockStateWithValues(blocks, values ?? {}), [blocks, values])
  const mode = resolveEditorMode({ preference, marked, recognized: reading.recognized })

  return { reading, blocks: current, mode, setMode: (next: 'steps' | 'canvas') => setPreference(workflowId, next) }
}
