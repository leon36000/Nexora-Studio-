import { decrypt } from '@sim/security/encryption'
import { getErrorMessage } from '@sim/utils/errors'
import { sleep as wait } from '@sim/utils/helpers'
import { isRecordLike } from '@sim/utils/object'
import postgres from 'postgres'
import type { StoredInstanceSettings } from '@/lib/nexora/instance-settings'
import {
  applyStoredSettingsToEnv,
  deriveInstanceOrganizationSlug,
  type InstanceSettingsGroup,
} from '@/lib/nexora/instance-settings-env'

const CONNECT_TIMEOUT_SECONDS = 5
const STATEMENT_TIMEOUT_MS = 10_000
/** Bounds one attempt end to end, should the connection hang where neither timeout applies. */
const ATTEMPT_TIMEOUT_MS = 15_000
/** Pauses between attempts: five attempts over about 40 s, more with slow failures. */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000] as const
/** Postgres `undefined_table`: the migrations have not created the schema yet. */
const UNDEFINED_TABLE = '42P01'

/** What the database holds: no instance organization, or its stored settings (if any). */
type StoredRead = { found: false } | { found: true; settings: unknown }

interface LoadOptions {
  /** Reads the instance organization's settings; the default opens one short connection. */
  read?: (databaseUrl: string, slug: string) => Promise<StoredRead>
  sleep?: (ms: number) => Promise<void>
}

/**
 * The stored settings could not be read after every attempt. Starting anyway would run the
 * instance without its sign-in policy (allowed domains, required single sign-on) until the next
 * restart, so the bootstrap exits instead and Docker tries again.
 */
export class InstanceSettingsUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`Instance settings could not be read: ${getErrorMessage(cause)}`)
    this.name = 'InstanceSettingsUnavailableError'
  }
}

async function readStoredSettings(databaseUrl: string, slug: string): Promise<StoredRead> {
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    idle_timeout: 1,
    connection: { statement_timeout: STATEMENT_TIMEOUT_MS },
    onnotice: () => {},
  })
  try {
    const rows = await sql<{ settings: unknown }[]>`
      select metadata -> 'nexoraSettings' as settings from organization where slug = ${slug} limit 2
    `
    // Two organizations with the slug: the instance organization is ambiguous and stays off.
    if (rows.length !== 1) return { found: false }
    return { found: true, settings: rows[0].settings }
  } catch (error) {
    if (isRecordLike(error) && error.code === UNDEFINED_TABLE) return { found: false }
    throw error
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {})
  }
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

async function readWithRetries(
  databaseUrl: string,
  slug: string,
  read: NonNullable<LoadOptions['read']>,
  sleep: NonNullable<LoadOptions['sleep']>
): Promise<StoredRead> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1])
    try {
      return await withDeadline(read(databaseUrl, slug), ATTEMPT_TIMEOUT_MS)
    } catch (error) {
      lastError = error
    }
  }
  throw new InstanceSettingsUnavailableError(lastError)
}

/**
 * Nexora edition, container bootstrap only: reads the instance settings an administrator saved in
 * Réglages (instance organization metadata) and copies them into `process.env` before the server
 * is imported. One short connection with the plain `postgres` driver, so the bootstrap bundle
 * stays small.
 *
 * Returns `null` when there is nothing to apply (no database URL or instance organization, a
 * fresh install, an organization without settings), otherwise the groups applied and those whose
 * secret did not decrypt (skipped, the server still starts). A database that cannot be read after
 * a few attempts throws {@link InstanceSettingsUnavailableError}: the stored policy is unknown.
 */
export async function loadInstanceSettingsIntoEnv(
  env: Record<string, string | undefined> = process.env,
  { read = readStoredSettings, sleep = wait }: LoadOptions = {}
): Promise<{ applied: InstanceSettingsGroup[]; failed: InstanceSettingsGroup[] } | null> {
  const slug = deriveInstanceOrganizationSlug(env)
  const databaseUrl = env.DATABASE_URL
  if (!slug || !databaseUrl) return null

  const stored = await readWithRetries(databaseUrl, slug, read, sleep)
  if (!stored.found) return null
  const raw = typeof stored.settings === 'string' ? JSON.parse(stored.settings) : stored.settings
  if (!isRecordLike(raw)) return null

  const key = Buffer.from(env.ENCRYPTION_KEY ?? '', 'hex')
  return applyStoredSettingsToEnv(env, raw as StoredInstanceSettings, async (value) => {
    return (await decrypt(value, key)).decrypted
  })
}
