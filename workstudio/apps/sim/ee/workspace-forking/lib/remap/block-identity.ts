// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export const EMPTY_FORK_BLOCK_MAP: ReadonlyMap<string, string> = new Map()

/** Deterministic, namespaced id for a block copied into another workflow. */
export function deriveForkBlockId(workflowId: string, blockId: string): string {
  return `${workflowId}:${blockId}`
}

export function buildForkBlockIdResolver(
  enabled: boolean,
  map: ReadonlyMap<string, string>
): (workflowId: string, blockId: string) => string {
  return (workflowId, blockId) =>
    map.get(blockId) ?? (enabled ? deriveForkBlockId(workflowId, blockId) : blockId)
}
