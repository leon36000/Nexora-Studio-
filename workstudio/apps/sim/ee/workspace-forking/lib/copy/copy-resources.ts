// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

const F = 'Workspace forking'

/** Copies the selected resource containers into the fork; the plan lists what content follows. */
export async function copyForkResourceContainers(
  _args: unknown
): Promise<{ contentPlan: { knowledgeBases: { sourceId: string }[] } }> {
  throw new FeatureDisabledError(F)
}

export async function copyForkResourceContent(
  _args: unknown
): Promise<{ copied: number; failed: number }> {
  throw new FeatureDisabledError(F)
}

/** `resolver` maps a source resource to its counterpart in the fork, or `null` when unmapped. */
export async function planForkMappedKbDocumentCopies(_args: {
  resolver: (kind: string, id: string) => string | null
  [key: string]: unknown
}): Promise<{
  documents: unknown[]
  mappingEntries: unknown[]
  docIdMap: Map<string, string>
}> {
  throw new FeatureDisabledError(F)
}
