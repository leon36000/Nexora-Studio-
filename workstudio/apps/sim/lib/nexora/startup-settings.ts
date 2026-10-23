import { decrypt } from '@sim/security/encryption'
import { isRecordLike } from '@sim/utils/object'
import postgres from 'postgres'
import type { StoredInstanceSettings } from '@/lib/nexora/instance-settings'
import {
  applyStoredSettingsToEnv,
  deriveInstanceOrganizationSlug,
  type InstanceSettingsGroup,
} from '@/lib/nexora/instance-settings-env'

const CONNECT_TIMEOUT_SECONDS = 5

/**
 * Nexora edition, container bootstrap only: reads the instance settings an administrator saved in
 * Réglages (instance organization metadata) and copies them into `process.env` before the server
 * is imported. One short connection with the plain `postgres` driver, so the bootstrap bundle
 * stays small. Returns `null` when there is nothing to read (no instance organization, no
 * database URL), otherwise the groups applied and those whose secret did not decrypt.
 */
export async function loadInstanceSettingsIntoEnv(
  env: Record<string, string | undefined> = process.env
): Promise<{ applied: InstanceSettingsGroup[]; failed: InstanceSettingsGroup[] } | null> {
  const slug = deriveInstanceOrganizationSlug(env)
  const databaseUrl = env.DATABASE_URL
  if (!slug || !databaseUrl) return null

  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    idle_timeout: 1,
    onnotice: () => {},
  })
  let rows: { settings: unknown }[]
  try {
    rows = await sql<{ settings: unknown }[]>`
      select metadata -> 'nexoraSettings' as settings from organization where slug = ${slug} limit 2
    `
  } finally {
    await sql.end({ timeout: 1 })
  }
  // Two organizations with the slug: the instance organization is ambiguous and stays off.
  if (rows.length !== 1) return null
  const raw = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings
  if (!isRecordLike(raw)) return null

  const key = Buffer.from(env.ENCRYPTION_KEY ?? '', 'hex')
  return applyStoredSettingsToEnv(env, raw as StoredInstanceSettings, async (value) => {
    return (await decrypt(value, key)).decrypted
  })
}
