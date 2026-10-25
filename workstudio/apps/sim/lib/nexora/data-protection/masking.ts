import { createHash } from 'node:crypto'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { LRUCache } from 'lru-cache'
import { env } from '@/lib/core/config/env'
import { maskPIIBatch } from '@/lib/guardrails/validate-pii'
import {
  type FoundPersonalData,
  PersonalDataServiceError,
} from '@/lib/nexora/data-protection/errors'
import { redactText } from '@/lib/nexora/traces/redaction'

const logger = createLogger('NexoraDataProtection')

/**
 * What the policy asks the local service to look for: people, contact and payment data. Places and
 * dates are left out on purpose — « Paris » and « le 12 mars » are not personal data, and masking
 * them would cripple every sentence an SME writes.
 */
export const PII_POLICY_ENTITIES = [
  'PERSON',
  'EMAIL_ADDRESS',
  'PHONE_NUMBER',
  'IBAN_CODE',
  'CREDIT_CARD',
  'IP_ADDRESS',
  'FR_NIR',
] as const

/** The service reads French and English; the instance talks French. */
const SERVICE_LANGUAGE = 'fr'

/** The marks the pattern masking of the traces writes, and the entity each one stands for. */
const PATTERN_MARKS: ReadonlyArray<readonly [mark: string, entity: string]> = [
  ['[IBAN]', 'IBAN_CODE'],
  ['[E-MAIL]', 'EMAIL_ADDRESS'],
  ['[CARTE]', 'CREDIT_CARD'],
  ['[TÉLÉPHONE]', 'PHONE_NUMBER'],
  ['[SECRET]', 'SECRET'],
]

const SERVICE_TOKEN = /<([A-Z][A-Z0-9_]*)>/g

/** Longest text kept in memory once masked; longer ones are analysed again each time. */
const CACHED_TEXT_CHARS = 20_000
const CACHE_TTL_MS = 15 * 60 * 1000

export interface MaskingDeps {
  /** `PII_URL` is set: the service must be asked, and a failure to ask stops the request. */
  serviceConfigured: () => boolean
  maskWithService: (texts: string[]) => Promise<string[]>
}

const defaultDeps: MaskingDeps = {
  serviceConfigured: () => Boolean(env.PII_URL?.trim()),
  maskWithService: (texts) => maskPIIBatch(texts, [...PII_POLICY_ENTITIES], SERVICE_LANGUAGE),
}

interface Protected {
  text: string
  found: FoundPersonalData
}

const protectedCache = new LRUCache<string, Protected>({ max: 2_000, ttl: CACHE_TTL_MS })

/** Test seam. */
export function resetProtectionCache(): void {
  protectedCache.clear()
}

function occurrences(text: string, mark: string): number {
  return text.split(mark).length - 1
}

function add(found: FoundPersonalData, entity: string, count: number): void {
  if (count > 0) found[entity] = (found[entity] ?? 0) + count
}

/** Pattern masking (IBAN with its check digits, e-mail, card, phone, secrets) and what it found. */
function maskByPatterns(text: string): Protected {
  const { text: masked } = redactText(text, 'standard')
  const found: FoundPersonalData = {}
  if (masked !== text) {
    for (const [mark, entity] of PATTERN_MARKS) {
      add(found, entity, occurrences(masked, mark) - occurrences(text, mark))
    }
  }
  return { text: masked, found }
}

function serviceTokens(text: string): Map<string, number> {
  const tokens = new Map<string, number>()
  for (const match of text.matchAll(SERVICE_TOKEN)) {
    tokens.set(match[1], (tokens.get(match[1]) ?? 0) + 1)
  }
  return tokens
}

function cacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/**
 * Masks the personal data of every text: the patterns first (deterministic, no dependency), then —
 * when the local service is installed — the service, which also recognizes names. Returns the
 * masked texts in the order given and what was found. A text the service has already seen is not
 * analysed again (an agent resends its whole conversation at every turn).
 *
 * When `PII_URL` is set and the service does not answer, this throws
 * {@link PersonalDataServiceError}: a policy that cannot be applied must not let the text through.
 */
export async function protectTexts(
  texts: readonly string[],
  deps: MaskingDeps = defaultDeps
): Promise<{ texts: string[]; found: FoundPersonalData }> {
  const found: FoundPersonalData = {}
  const patterned = texts.map((text) => (text ? maskByPatterns(text) : { text, found: {} }))
  for (const item of patterned) {
    for (const [entity, count] of Object.entries(item.found)) add(found, entity, count)
  }
  if (!deps.serviceConfigured()) return { texts: patterned.map((item) => item.text), found }

  const result = patterned.map((item) => item.text)
  const pending: Array<{ index: number; key: string }> = []
  const firstOfKey = new Map<string, number>()
  patterned.forEach((item, index) => {
    if (!item.text) return
    const key = cacheKey(item.text)
    const known = protectedCache.get(key)
    if (known) {
      result[index] = known.text
      for (const [entity, count] of Object.entries(known.found)) add(found, entity, count)
    } else if (!firstOfKey.has(key)) {
      firstOfKey.set(key, index)
      pending.push({ index, key })
    }
  })

  if (pending.length > 0) {
    let masked: string[]
    try {
      masked = await deps.maskWithService(pending.map(({ index }) => patterned[index].text))
      if (masked.length !== pending.length) throw new Error('The service returned a short answer')
    } catch (error) {
      logger.error('The personal-data service could not mask a request', {
        error: getErrorMessage(error),
      })
      throw new PersonalDataServiceError()
    }
    pending.forEach(({ index, key }, position) => {
      const before = serviceTokens(patterned[index].text)
      const itemFound: FoundPersonalData = {}
      for (const [entity, count] of serviceTokens(masked[position])) {
        add(itemFound, entity, count - (before.get(entity) ?? 0))
      }
      const entry = { text: masked[position], found: itemFound }
      if (patterned[index].text.length <= CACHED_TEXT_CHARS) protectedCache.set(key, entry)
      result[index] = entry.text
      for (const [entity, count] of Object.entries(itemFound)) add(found, entity, count)
    })
    // A duplicate of a pending text, in the same call, takes its answer.
    patterned.forEach((item, index) => {
      if (!item.text) return
      const key = cacheKey(item.text)
      const first = firstOfKey.get(key)
      if (first !== undefined && first !== index) {
        result[index] = result[first]
        const entry = protectedCache.get(key)
        for (const [entity, count] of Object.entries(entry?.found ?? {})) add(found, entity, count)
      }
    })
  }
  return { texts: result, found }
}
