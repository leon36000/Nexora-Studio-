import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { LRUCache } from 'lru-cache'
import { listUpstreamModels } from '@/lib/nexora/developer-api/upstream'
import { listNexoraModels, type NexoraModel } from '@/lib/nexora/model-admin'
import { readModelCards, resolveModelCard, type StoredModelCard } from '@/lib/nexora/model-cards'
import { DEFAULT_MODEL_ALIAS, type ModelLocation } from '@/lib/nexora/model-ids'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'
import { findProviderFromModel } from '@/providers/models'

const logger = createLogger('NexoraModelLocation')

/** A new model, a new default alias or a corrected card reaches a running process within this delay. */
const LOCATION_TTL_MS = 30_000

/** Where the model list, the cards and the aliases come from. */
export interface LocationSources {
  adminModels: () => Promise<NexoraModel[]>
  cards: () => Promise<Record<string, StoredModelCard>>
  aliases: () => Promise<Array<{ id: string; aliases: string[] }>>
}

/** Where each model name and alias (lower case) runs, as the model cards say. */
export type LocationIndex = ReadonlyMap<string, ModelLocation>

const defaultSources: LocationSources = {
  adminModels: () => listNexoraModels(),
  cards: async () => {
    const organizationId = await getInstanceOrganizationId()
    return organizationId ? readModelCards(organizationId) : {}
  },
  aliases: async () =>
    (await listUpstreamModels()).map((model) => ({ id: model.id, aliases: model.aliases })),
}

async function attempt<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read()
  } catch (error) {
    logger.warn(`Model ${label} could not be read; models are judged without it`, {
      error: getErrorMessage(error),
    })
    return fallback
  }
}

/**
 * The location of every Nexora API model by name and alias. What cannot be read is left out, so
 * the models it would have described are not found — and a model that is not found is treated as
 * off the instance (see {@link isOffInstanceModel}).
 */
export async function buildLocationIndex(
  sources: LocationSources = defaultSources
): Promise<LocationIndex> {
  const [models, cards, aliases] = await Promise.all([
    attempt('administration list', sources.adminModels, [] as NexoraModel[]),
    attempt('cards', sources.cards, {} as Record<string, StoredModelCard>),
    attempt('aliases', sources.aliases, [] as Array<{ id: string; aliases: string[] }>),
  ])
  const index = new Map<string, ModelLocation>()
  for (const model of models) {
    const location = resolveModelCard(model, cards[model.name]).location
    index.set(model.name.toLowerCase(), location)
    if (model.isDefault) index.set(DEFAULT_MODEL_ALIAS.toLowerCase(), location)
  }
  for (const { id, aliases: names } of aliases) {
    const location = index.get(id.toLowerCase())
    if (location === undefined) continue
    for (const alias of names) index.set(alias.toLowerCase(), location)
  }
  return index
}

const indexCache = new LRUCache<'index', LocationIndex>({
  max: 1,
  ttl: LOCATION_TTL_MS,
  fetchMethod: () => buildLocationIndex(),
})

/** Test seam. */
export function resetModelLocationCache(): void {
  indexCache.clear()
}

/**
 * Whether a model sends what it is given outside this server — what the instance calls
 * « Hors instance ». The id is a WorkStudio model id (`vllm/<name>`, `ollama/<name>`) or a Nexora
 * API name or alias (`nexora-default`).
 *
 * - `ollama/…` and a Nexora API model whose card says `local` or `eu` stay on this server (or in
 *   the EU, which the policy does not count);
 * - a model of another provider (OpenAI, Anthropic…) is off the instance;
 * - a Nexora API model that cannot be found — unknown name, or the list could not be read — is
 *   judged off the instance: protecting too much is the prudent mistake.
 */
export async function isOffInstanceModel(modelId: string, index?: LocationIndex): Promise<boolean> {
  const id = modelId.trim()
  if (/^ollama\//i.test(id)) return false
  const provider = findProviderFromModel(id)
  if (provider && provider !== 'vllm' && provider !== 'ollama') return true
  const locations = index ?? (await indexCache.fetch('index')) ?? new Map<string, ModelLocation>()
  const location = locations.get(id.replace(/^vllm\//i, '').toLowerCase())
  return location === undefined || location === 'external'
}
