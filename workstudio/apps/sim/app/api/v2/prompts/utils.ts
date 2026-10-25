import type { V2Prompt, V2PromptSummary } from '@/lib/api/contracts/v2/prompts'
import { createV2ResourceConcealmentPolicy } from '@/lib/api/server/routes'
import type { PromptRecord, PromptVersionRecord } from '@/lib/nexora/prompts/repository'

/** Shared serialization for the v2 prompts surface. */
export function toV2PromptSummary(prompt: PromptRecord): V2PromptSummary {
  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    labels: prompt.labels,
    latestVersion: prompt.latestVersion,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  }
}

export function toV2Prompt(prompt: PromptRecord, version: PromptVersionRecord): V2Prompt {
  return {
    ...toV2PromptSummary(prompt),
    version: {
      number: version.version,
      content: version.content,
      variables: version.variables,
      note: version.note,
      createdAt: version.createdAt.toISOString(),
    },
  }
}

export const promptResourceErrorPolicy = createV2ResourceConcealmentPolicy({
  notFoundMessage: 'Prompt not found',
})
