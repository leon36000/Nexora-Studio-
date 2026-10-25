import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { decryptSecret, encryptSecret } from '@/lib/core/security/encryption'
import type { RedactionMode } from '@/lib/nexora/traces/redaction'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

const logger = createLogger('NexoraTraceSettings')

/**
 * Nexora edition: the instance's trace settings (capture, retention, masking, OTLP export), kept
 * in the instance organization's metadata under `nexoraTraces`, like the budgets. Header values of
 * the export are encrypted at rest and never leave the server.
 */
const METADATA_KEY = 'nexoraTraces'
const SETTINGS_CACHE_TTL_MS = 30_000
const MAX_RETENTION_DAYS = 365
const MAX_CONVERSATION_RETENTION_DAYS = 3650
const MAX_HEADERS = 10
const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/
const REDACTION_MODES: readonly RedactionMode[] = ['standard', 'strict', 'none']

interface OtlpHeader {
  name: string
  value: string
}

interface OtlpSettings {
  enabled: boolean
  endpoint: string
  headers: OtlpHeader[]
}

/** Header values are encrypted in the stored form and clear in {@link TraceSettings}. */
export interface StoredTraceSettings {
  enabled: boolean
  retentionDays: number
  redaction: RedactionMode
  /** Assistant conversations are deleted this many days after their last message; `null` keeps them. */
  conversationRetentionDays: number | null
  otlp: OtlpSettings
}

export type TraceSettings = StoredTraceSettings

export interface TraceSettingsChange {
  enabled?: boolean
  retentionDays?: number
  redaction?: RedactionMode
  conversationRetentionDays?: number | null
  otlp?: {
    enabled?: boolean
    endpoint?: string
    /** The whole list; an empty value keeps the stored value of the header of the same name. */
    headers?: { name: string; value?: string }[]
  }
}

export interface PresentedTraceSettings extends Omit<StoredTraceSettings, 'otlp'> {
  otlp: {
    enabled: boolean
    endpoint: string
    headers: { name: string; hasValue: boolean }[]
  }
}

/** A setting outside its allowed range or shape. The message is shown to the administrator. */
export class TraceSettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TraceSettingsError'
  }
}

export const DEFAULT_TRACE_SETTINGS: StoredTraceSettings = Object.freeze({
  enabled: true,
  retentionDays: 30,
  redaction: 'standard',
  conversationRetentionDays: null,
  otlp: Object.freeze({ enabled: false, endpoint: '', headers: [] as OtlpHeader[] }),
}) as StoredTraceSettings

function wholeDays(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
    ? value
    : null
}

/** Reads the settings kept in `organization.metadata`, tolerating anything stored there. */
export function parseStoredTraceSettings(metadata: unknown): StoredTraceSettings {
  const record = toRecord(isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined)
  const otlp = toRecord(record.otlp)
  const headers = Array.isArray(otlp.headers)
    ? otlp.headers.flatMap((entry): OtlpHeader[] => {
        const header = toRecord(entry)
        return typeof header.name === 'string' && typeof header.value === 'string'
          ? [{ name: header.name, value: header.value }]
          : []
      })
    : []
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : DEFAULT_TRACE_SETTINGS.enabled,
    retentionDays:
      wholeDays(record.retentionDays, MAX_RETENTION_DAYS) ?? DEFAULT_TRACE_SETTINGS.retentionDays,
    redaction: REDACTION_MODES.find((mode) => mode === record.redaction) ?? 'standard',
    conversationRetentionDays: wholeDays(
      record.conversationRetentionDays,
      MAX_CONVERSATION_RETENTION_DAYS
    ),
    otlp: {
      enabled: otlp.enabled === true,
      endpoint: typeof otlp.endpoint === 'string' ? otlp.endpoint : '',
      headers,
    },
  }
}

function validEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function nextHeaders(
  stored: OtlpHeader[],
  requested: NonNullable<NonNullable<TraceSettingsChange['otlp']>['headers']>,
  encrypt: (secret: string) => Promise<string>
): Promise<OtlpHeader[]> {
  if (requested.length > MAX_HEADERS) {
    throw new TraceSettingsError(`Au plus ${MAX_HEADERS} en-têtes sont acceptés.`)
  }
  const headers: OtlpHeader[] = []
  for (const { name, value } of requested) {
    if (!HEADER_NAME.test(name)) throw new TraceSettingsError(`Nom d’en-tête invalide : ${name}`)
    if (value) {
      headers.push({ name, value: await encrypt(value) })
      continue
    }
    const kept = stored.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    if (!kept) throw new TraceSettingsError(`L’en-tête ${name} n’a pas de valeur.`)
    headers.push(kept)
  }
  return headers
}

/** The stored settings after a change; throws {@link TraceSettingsError} on an invalid value. */
export async function applyTraceSettingsChange(
  stored: StoredTraceSettings,
  change: TraceSettingsChange,
  encrypt: (secret: string) => Promise<string>
): Promise<StoredTraceSettings> {
  const next: StoredTraceSettings = { ...stored, otlp: { ...stored.otlp } }
  if (change.enabled !== undefined) next.enabled = change.enabled
  if (change.retentionDays !== undefined) {
    const days = wholeDays(change.retentionDays, MAX_RETENTION_DAYS)
    if (days === null) {
      throw new TraceSettingsError(
        `La rétention des traces va de 1 à ${MAX_RETENTION_DAYS} jours.`
      )
    }
    next.retentionDays = days
  }
  if (change.redaction !== undefined) {
    if (!REDACTION_MODES.includes(change.redaction)) {
      throw new TraceSettingsError('Mode de masquage inconnu.')
    }
    next.redaction = change.redaction
  }
  if (change.conversationRetentionDays !== undefined) {
    if (change.conversationRetentionDays === null) {
      next.conversationRetentionDays = null
    } else {
      const days = wholeDays(change.conversationRetentionDays, MAX_CONVERSATION_RETENTION_DAYS)
      if (days === null) {
        throw new TraceSettingsError(
          `La rétention des conversations va de 1 à ${MAX_CONVERSATION_RETENTION_DAYS} jours.`
        )
      }
      next.conversationRetentionDays = days
    }
  }
  const otlp = change.otlp
  if (otlp) {
    if (otlp.endpoint !== undefined) {
      const endpoint = otlp.endpoint.trim()
      if (endpoint !== '' && !validEndpoint(endpoint)) {
        throw new TraceSettingsError('L’adresse du collecteur doit commencer par http:// ou https://.')
      }
      next.otlp.endpoint = endpoint
    }
    if (otlp.headers !== undefined) {
      next.otlp.headers = await nextHeaders(stored.otlp.headers, otlp.headers, encrypt)
    }
    if (otlp.enabled !== undefined) next.otlp.enabled = otlp.enabled
    if (next.otlp.enabled && next.otlp.endpoint === '') {
      throw new TraceSettingsError('Indiquez l’adresse du collecteur avant d’activer l’export.')
    }
  }
  return next
}

/** The settings as the administrator's screen gets them: no header value, encrypted or not. */
export function presentTraceSettings(settings: StoredTraceSettings): PresentedTraceSettings {
  return {
    ...settings,
    otlp: {
      enabled: settings.otlp.enabled,
      endpoint: settings.otlp.endpoint,
      headers: settings.otlp.headers.map(({ name }) => ({ name, hasValue: true })),
    },
  }
}

const settingsCache = new LRUCache<'settings', TraceSettings>({
  max: 1,
  ttl: SETTINGS_CACHE_TTL_MS,
})

async function readStored(): Promise<{
  organizationId: string
  stored: StoredTraceSettings
} | null> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return null
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return { organizationId, stored: parseStoredTraceSettings(row?.metadata) }
}

async function decryptHeaders(headers: OtlpHeader[]): Promise<OtlpHeader[]> {
  const clear: OtlpHeader[] = []
  for (const { name, value } of headers) {
    try {
      clear.push({ name, value: (await decryptSecret(value, { logFailure: false })).decrypted })
    } catch (error) {
      logger.warn('An export header could not be decrypted and is left out', {
        header: name,
        error: getErrorMessage(error),
      })
    }
  }
  return clear
}

/**
 * The settings in force, header values decrypted, from a 30 s cache (a change made in another
 * process applies within that time). Unreadable settings fall back to the defaults: tracing must
 * never depend on a working settings read.
 */
export async function loadTraceSettings(): Promise<TraceSettings> {
  const cached = settingsCache.get('settings')
  if (cached) return cached
  try {
    const read = await readStored()
    const settings = read
      ? {
          ...read.stored,
          otlp: { ...read.stored.otlp, headers: await decryptHeaders(read.stored.otlp.headers) },
        }
      : DEFAULT_TRACE_SETTINGS
    settingsCache.set('settings', settings)
    return settings
  } catch (error) {
    logger.warn('Trace settings could not be read; defaults apply', {
      error: getErrorMessage(error),
    })
    return DEFAULT_TRACE_SETTINGS
  }
}

/** The settings for the administrator's screen (header values never included). */
export async function readTraceSettings(): Promise<PresentedTraceSettings> {
  return presentTraceSettings((await readStored())?.stored ?? DEFAULT_TRACE_SETTINGS)
}

/** Applies a change under a row lock, keeping every other metadata key, and drops the cache. */
export async function saveTraceSettings(
  change: TraceSettingsChange
): Promise<PresentedTraceSettings> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) throw new TraceSettingsError('Aucune organisation d’instance.')
  const encrypt = async (secret: string) => (await encryptSecret(secret)).encrypted
  const saved = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const next = await applyTraceSettingsChange(
      parseStoredTraceSettings(row?.metadata),
      change,
      encrypt
    )
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row?.metadata), [METADATA_KEY]: next } })
      .where(eq(organization.id, organizationId))
    return next
  })
  settingsCache.clear()
  return presentTraceSettings(saved)
}

/** Drops the cached settings. Test seam. */
export function resetTraceSettingsCache(): void {
  settingsCache.clear()
}
