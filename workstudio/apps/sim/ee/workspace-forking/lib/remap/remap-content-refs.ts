// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export interface ForkContentRefMaps {
  fileIds?: ReadonlyMap<string, string>
  fileKeys?: ReadonlyMap<string, string>
  workspaceId?: { from: string; to: string }
}

function replaceAll(text: string, from: string, to: string): string {
  return from && from !== to ? text.split(from).join(to) : text
}

/**
 * Rewrites file ids, storage keys and the workspace id embedded in text. Used by the core chat
 * copy path, so it is implemented (literal replacement, longest keys first) rather than stubbed.
 */
export function rewriteForkContentRefs(text: string, maps: ForkContentRefMaps): string {
  if (!text) return text
  let out = text
  const pairs = [...(maps.fileKeys ?? new Map()), ...(maps.fileIds ?? new Map())].sort(
    (a, b) => b[0].length - a[0].length
  )
  for (const [from, to] of pairs) out = replaceAll(out, from, to)
  if (maps.workspaceId) out = replaceAll(out, maps.workspaceId.from, maps.workspaceId.to)
  return out
}
