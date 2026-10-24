import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import type { NexoraModelSource } from '@/lib/nexora/model-admin'
import {
  MAX_CONTEXT_TOKENS,
  MIN_CONTEXT_TOKENS,
  MODEL_LOCATIONS,
  type ModelLocation,
  type NexoraModelUsage,
} from '@/lib/nexora/model-ids'

/**
 * Nexora edition: the card of each model in Réglages › Modèles — what « Tester » found out
 * (reasoning, tools), what an administrator declared (context length, and where an
 * OpenAI-compatible service keeps the data), kept in the instance organization's metadata by
 * model name.
 */

export interface StoredModelCard {
  reasoning?: boolean
  tools?: boolean
  contextTokens?: number
  location?: ModelLocation
  testedAt?: string
}

/** A change to one card; `null` on a field clears it. */
export type ModelCardChange = {
  [K in keyof StoredModelCard]?: StoredModelCard[K] | null
}

export interface NexoraModelCard {
  reasoning: boolean | null
  tools: boolean | null
  vision: boolean
  contextTokens: number | null
  location: ModelLocation
  /** Only an OpenAI-compatible service's location is declared by an administrator. */
  locationEditable: boolean
  testedAt: string | null
}

const METADATA_KEY = 'nexoraModelCards'

function isLocation(value: unknown): value is ModelLocation {
  return typeof value === 'string' && (MODEL_LOCATIONS as readonly string[]).includes(value)
}

function isContextTokens(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= MIN_CONTEXT_TOKENS &&
    (value as number) <= MAX_CONTEXT_TOKENS
  )
}

function parseCard(value: unknown): StoredModelCard | null {
  if (!isRecordLike(value)) return null
  const card: StoredModelCard = {}
  if (typeof value.reasoning === 'boolean') card.reasoning = value.reasoning
  if (typeof value.tools === 'boolean') card.tools = value.tools
  if (isContextTokens(value.contextTokens)) card.contextTokens = value.contextTokens
  if (isLocation(value.location)) card.location = value.location
  if (typeof value.testedAt === 'string') card.testedAt = value.testedAt
  return card
}

/** The cards kept in `organization.metadata`, tolerating anything stored there. */
export function parseModelCards(metadata: unknown): Record<string, StoredModelCard> {
  const stored = isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined
  if (!isRecordLike(stored)) return {}
  const cards: Record<string, StoredModelCard> = {}
  for (const [name, value] of Object.entries(stored)) {
    const card = parseCard(value)
    if (card) cards[name] = card
  }
  return cards
}

/** The organization metadata with one card changed (or removed with `null`); the rest is kept. */
export function mergeModelCard(
  metadata: unknown,
  name: string,
  change: ModelCardChange | null
): Record<string, unknown> {
  const cards = parseModelCards(metadata)
  if (change === null) {
    delete cards[name]
  } else {
    const merged: Record<string, unknown> = { ...cards[name] }
    for (const [field, value] of Object.entries(change)) {
      if (value === null) delete merged[field]
      else if (value !== undefined) merged[field] = value
    }
    const card = parseCard(merged)
    if (card && Object.keys(card).length > 0) cards[name] = card
    else delete cards[name]
  }
  return { ...toRecord(metadata), [METADATA_KEY]: cards }
}

/**
 * The product's own compose services (`deploy/compose.yml`) a model URL may name. Any other
 * host, dotless or not (a LAN machine, `localhost`, a developer's container), may lead off the
 * server.
 */
const INSTANCE_MODEL_SERVICES: ReadonlySet<string> = new Set([
  'whisper',
  'ollama',
  'nexora-api',
  'searxng',
])

/** A service of the instance itself by its compose name (`http://whisper:8000`). */
function isInstanceService(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return INSTANCE_MODEL_SERVICES.has(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * A model's card as the settings page shows it: a model on the bundled Ollama runs on this
 * server, Mistral AI hosts in the EU, and an OpenAI-compatible service is off the instance until
 * an administrator declares otherwise — unless it is a bundled service of the instance by its
 * compose name (the transcription service). A tunnel through `host.docker.internal` stays off the
 * instance: it may lead anywhere.
 */
export function resolveModelCard(
  model: {
    name: string
    usage: NexoraModelUsage
    source: NexoraModelSource
    providerUrl?: string | null
  },
  stored: StoredModelCard = {}
): NexoraModelCard {
  const locationEditable = model.source === 'openai-compatible'
  const location: ModelLocation =
    model.source === 'ollama'
      ? 'local'
      : model.source === 'mistral'
        ? 'eu'
        : (stored.location ?? (isInstanceService(model.providerUrl) ? 'local' : 'external'))
  return {
    reasoning: stored.reasoning ?? null,
    tools: stored.tools ?? null,
    vision: model.usage === 'vision',
    contextTokens: stored.contextTokens ?? null,
    location,
    locationEditable,
    testedAt: stored.testedAt ?? null,
  }
}

export async function readModelCards(
  organizationId: string
): Promise<Record<string, StoredModelCard>> {
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return parseModelCards(row?.metadata)
}

/** Applies one change under a row lock, so two administrators saving at once both land. */
export async function updateModelCard(
  organizationId: string,
  name: string,
  change: ModelCardChange | null
): Promise<StoredModelCard | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const metadata = mergeModelCard(row?.metadata, name, change)
    await tx.update(organization).set({ metadata }).where(eq(organization.id, organizationId))
    return parseModelCards(metadata)[name] ?? null
  })
}
