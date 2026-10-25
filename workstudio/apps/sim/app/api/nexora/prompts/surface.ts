import type {
  NexoraPromptDetail,
  NexoraPromptSummary,
  NexoraPromptVersion,
} from '@/lib/api/contracts/nexora-prompts'
import type {
  PromptDetail,
  PromptRecord,
  PromptVersionRecord,
} from '@/lib/nexora/prompts/repository'

/** A prompt on the wire: dates as ISO strings. */
export function presentPromptSummary(prompt: PromptRecord): NexoraPromptSummary {
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

export function presentPromptVersion(version: PromptVersionRecord): NexoraPromptVersion {
  return {
    id: version.id,
    version: version.version,
    content: version.content,
    variables: version.variables,
    note: version.note,
    createdByName: version.createdByName,
    createdAt: version.createdAt.toISOString(),
  }
}

export function presentPromptDetail(prompt: PromptDetail): NexoraPromptDetail {
  return { ...presentPromptSummary(prompt), versions: prompt.versions.map(presentPromptVersion) }
}
