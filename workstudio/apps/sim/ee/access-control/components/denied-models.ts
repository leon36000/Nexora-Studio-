// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** A chat model of the instance as the group editor lists it. */
interface ListedModel {
  name: string
  usage: string
  isDefault: boolean
  card: { location: string }
}

export interface ModelRow {
  /** The id a block stores and the group's `deniedModels` names: `vllm/<name>`. */
  id: string
  name: string
  /** Where the model runs (`local`, `eu`, `external`), `null` for a model no longer listed. */
  location: string | null
  isDefault: boolean
  allowed: boolean
}

const workstudioId = (name: string) => `vllm/${name}`

/** The models a group may use, one row per chat model, then the denied ones that no longer exist. */
export function modelRows(models: readonly ListedModel[], denied: readonly string[]): ModelRow[] {
  const deniedIds = new Set(denied.map((id) => id.toLowerCase()))
  const rows: ModelRow[] = models
    .filter((model) => model.usage === 'chat')
    .map((model) => ({
      id: workstudioId(model.name),
      name: model.name,
      location: model.card.location,
      isDefault: model.isDefault,
      allowed: !deniedIds.has(workstudioId(model.name).toLowerCase()),
    }))
  const listed = new Set(rows.map((row) => row.id.toLowerCase()))
  for (const id of denied) {
    if (listed.has(id.toLowerCase())) continue
    rows.push({
      id,
      name: id.replace(/^vllm\//i, ''),
      location: null,
      isDefault: false,
      allowed: false,
    })
    listed.add(id.toLowerCase())
  }
  return rows
}

/** The denylist with one model allowed again or denied (compared without case). */
export function setModelAllowed(
  denied: readonly string[],
  modelId: string,
  allowed: boolean
): string[] {
  const rest = denied.filter((id) => id.toLowerCase() !== modelId.toLowerCase())
  return allowed ? rest : [...rest, modelId]
}

export function sameModelList(a: readonly string[], b: readonly string[]): boolean {
  const normalize = (ids: readonly string[]) => ids.map((id) => id.toLowerCase()).sort()
  return normalize(a).join('\n') === normalize(b).join('\n')
}
