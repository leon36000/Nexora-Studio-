import { isRecordLike, toRecord } from '@sim/utils/object'
import { isTriggerType } from '@/lib/nexora/steps/catalog'

/**
 * The sub-block the Copilot and the SME templates add to their trigger: it says « this workflow
 * was built from steps, open it in the Steps view ». The canvas ignores it (it is in no block
 * config), a copy of the workflow keeps it, and no migration is needed to store it.
 */
export const STEPS_MARKER = { id: 'nexoraView', type: 'short-input', value: 'etapes' } as const

export type EditorMode = 'steps' | 'canvas'

/** Whether the workflow's trigger carries the Steps marker. */
export function hasStepsMarker(state: unknown): boolean {
  if (!isRecordLike(state)) return false
  return Object.values(toRecord(state.blocks)).some((block) => {
    if (!isRecordLike(block) || typeof block.type !== 'string' || !isTriggerType(block.type))
      return false
    const marker = toRecord(toRecord(block.subBlocks)[STEPS_MARKER.id])
    return marker.value === STEPS_MARKER.value
  })
}

interface ModeInput {
  /** What the person chose for this workflow, if they ever did. */
  preference: EditorMode | null
  marked: boolean
  recognized: boolean
}

/**
 * Which view a workflow opens in. A choice made by the person always wins (the Steps view is
 * read-only when the shape is not recognized); without one, only a workflow built from steps and
 * still in a recognized shape opens in Steps, and every other workflow opens in the canvas.
 */
export function resolveEditorMode({ preference, marked, recognized }: ModeInput): EditorMode {
  if (preference !== null) return preference
  return marked && recognized ? 'steps' : 'canvas'
}
