import {
  type ForkRemapKind,
  scanWorkflowReferences,
} from '@/lib/workflows/references/remap-references'
import type { CanonicalModeOverrides } from '@/lib/workflows/subblocks/visibility'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

/** A block reduced to what the reference scanner reads (incl. canonical context for detection). */
interface ScannerBlock {
  id: string
  name: string
  type: string
  subBlocks: unknown
  canonicalModes?: CanonicalModeOverrides
  triggerMode?: boolean
}

/**
 * Unique source ids of one remap kind referenced across a set of blocks - both top-level
 * selectors and nested tool params. Used at fork/promote time to decide which KB documents
 * a copy must create placeholders for (so their references remap to the copied doc instead
 * of being cleared). The resolver is irrelevant here (every reference is detected regardless
 * of mapping), so a null resolver is passed.
 */
export function collectReferencedResourceIds(
  blocks: ScannerBlock[],
  kind: ForkRemapKind
): Set<string> {
  const ids = new Set<string>()
  for (const reference of scanWorkflowReferences(blocks, () => null).references) {
    if (reference.kind === kind) ids.add(reference.sourceId)
  }
  return ids
}

/**
 * Map a workflow state's blocks to the `{ id, name, subBlocks }` shape the reference scanner
 * consumes. Confines the `subBlocks as unknown` widening (the stored subblock record is opaque
 * to the scanner, which re-narrows per subblock type) to one spot shared by every fork caller
 * that scans a source workflow's references.
 */
export function toScannerBlocks(state: WorkflowState): ScannerBlock[] {
  return Object.values(state.blocks).map((block) => ({
    id: block.id,
    name: block.name,
    type: block.type,
    subBlocks: block.subBlocks as unknown,
    canonicalModes: block.data?.canonicalModes,
    triggerMode: block.triggerMode,
  }))
}
