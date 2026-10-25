import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { normalizeLexicon } from '@/lib/nexora/voice/lexicon'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: the company's lexicon (names of people, products, places) kept in the instance
 * organization's `metadata.nexoraVoice`, and given to Whisper as its initial prompt. Read by every
 * transcription, so it is served from memory for {@link LEXICON_TTL_MS}; a save clears it in the
 * process that saved (the other processes catch up within the TTL, and a lexicon is no secret).
 */
const logger = createLogger('NexoraVoiceLexicon')

const METADATA_KEY = 'nexoraVoice'
const LEXICON_TTL_MS = 30_000
const CACHE_KEY = 'lexicon'

const cache = new LRUCache<typeof CACHE_KEY, string[]>({ max: 1, ttl: LEXICON_TTL_MS })

export function resetVoiceLexiconCache(): void {
  cache.clear()
}

function lexiconOf(metadata: unknown): string[] {
  return normalizeLexicon(toRecord(toRecord(metadata)[METADATA_KEY]).lexicon)
}

async function readLexicon(): Promise<string[]> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return []
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return lexiconOf(row?.metadata)
}

/** The lexicon, or none when it cannot be read: a transcription never waits on it, a failure is not cached. */
export async function readVoiceLexicon(): Promise<string[]> {
  const cached = cache.get(CACHE_KEY)
  if (cached !== undefined) return cached
  try {
    const lexicon = await readLexicon()
    cache.set(CACHE_KEY, lexicon)
    return lexicon
  } catch (error) {
    logger.warn('The voice lexicon could not be read; transcribing without it', { error })
    return []
  }
}

/** The lexicon to administer: unlike {@link readVoiceLexicon}, a failed read is an error. */
export async function readVoiceLexiconOf(organizationId: string): Promise<string[]> {
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return lexiconOf(row?.metadata)
}

/** Saves the lexicon under a row lock, keeping every other metadata key. */
export async function saveVoiceLexicon(
  organizationId: string,
  terms: readonly string[]
): Promise<string[]> {
  const lexicon = normalizeLexicon(terms)
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row?.metadata), [METADATA_KEY]: { lexicon } } })
      .where(eq(organization.id, organizationId))
  })
  cache.set(CACHE_KEY, lexicon)
  return lexicon
}
