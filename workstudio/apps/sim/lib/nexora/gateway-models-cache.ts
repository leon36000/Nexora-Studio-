import { LRUCache } from 'lru-cache'

/** How long a person's model list is kept: models change rarely, pages open often. */
const MODELS_TTL_MS = 60_000

/**
 * The model ids each person's key may use at the site's gateway, kept for a minute. Only the list is
 * kept, never the key; an answer that failed is not kept (the loader throws, the entry is dropped).
 */
const modelsByPerson = new LRUCache<string, string[], () => Promise<string[]>>({
  max: 5_000,
  ttl: MODELS_TTL_MS,
  fetchMethod: (_userId, _stale, { context }) => context(),
})

/** The person's model list, loaded by `load` only when it is not already kept (concurrent callers share one load). */
export async function getCachedGatewayModels(
  userId: string,
  load: () => Promise<string[]>
): Promise<string[]> {
  const models = await modelsByPerson.fetch(userId, { context: load })
  return models ?? []
}

export function clearGatewayModelsCache(): void {
  modelsByPerson.clear()
}
