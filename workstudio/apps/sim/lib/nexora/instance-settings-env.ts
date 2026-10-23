import { slugify } from '@sim/utils/string'
import type { StoredInstanceSettings } from '@/lib/nexora/instance-settings'

/**
 * Nexora edition: the interface settings (single sign-on, e-mail, sign-up domains) become
 * environment variables when WorkStudio starts, because Better Auth reads its providers and the
 * mailer its transport once, at import time. Kept free of application imports: the container
 * bootstrap bundles this module before the server exists.
 */
export type InstanceSettingsGroup = 'sso' | 'smtp' | 'domains'

type EnvRecord = Record<string, string | undefined>
type Decrypt = (value: string) => Promise<string>

/** Which groups the startup filled from the interface settings, comma-separated. */
const FROM_SETTINGS_VAR = 'NEXORA_SETTINGS_FROM_DB'
/** The settings revision the running process started with. */
export const SETTINGS_REVISION_VAR = 'NEXORA_SETTINGS_REVISION'

/** The variable whose presence in deploy/.env claims each group. */
const GROUP_KEY_VAR: Record<InstanceSettingsGroup, string> = {
  sso: 'NEXORA_OIDC_ISSUER',
  smtp: 'SMTP_HOST',
  domains: 'ALLOWED_LOGIN_DOMAINS',
}

/** Docker compose passes `${VAR:-}` as an empty string, which means unset. */
function isSet(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function groupsFromSettings(env: Partial<EnvRecord>): Set<string> {
  return new Set((env[FROM_SETTINGS_VAR] ?? '').split(',').filter(Boolean))
}

/** For each group, whether deploy/.env sets it (and therefore wins over the interface). */
export function envOverrides(env: Partial<EnvRecord>): Record<InstanceSettingsGroup, boolean> {
  const fromSettings = groupsFromSettings(env)
  const overridden = (group: InstanceSettingsGroup) =>
    isSet(env[GROUP_KEY_VAR[group]]) && !fromSettings.has(group)
  return { sso: overridden('sso'), smtp: overridden('smtp'), domains: overridden('domains') }
}

async function ssoVariables(
  sso: StoredInstanceSettings['sso'],
  decrypt: Decrypt
): Promise<EnvRecord | null> {
  // Without a button name the sign-in button stays hidden: nobody could use the provider.
  if (!sso?.issuer || !sso.clientId || !sso.clientSecret || !sso.buttonName) return null
  return {
    NEXORA_OIDC_ISSUER: sso.issuer,
    NEXORA_OIDC_CLIENT_ID: sso.clientId,
    NEXORA_OIDC_CLIENT_SECRET: await decrypt(sso.clientSecret),
    NEXT_PUBLIC_NEXORA_OIDC_NAME: sso.buttonName,
    NEXORA_OIDC_REQUIRED: sso.required ? 'true' : 'false',
  }
}

async function smtpVariables(
  smtp: StoredInstanceSettings['smtp'],
  decrypt: Decrypt
): Promise<EnvRecord | null> {
  if (!smtp?.host || !smtp.port) return null
  return {
    SMTP_HOST: smtp.host,
    SMTP_PORT: String(smtp.port),
    SMTP_USER: smtp.user || undefined,
    SMTP_PASS: smtp.password ? await decrypt(smtp.password) : undefined,
    FROM_EMAIL_ADDRESS: smtp.from || undefined,
  }
}

/**
 * Writes the stored settings into `env`, group by group, only where deploy/.env leaves the group
 * unset: a group is never assembled from both sources. A group whose secret no longer decrypts
 * (the encryption key changed) is skipped and reported, so WorkStudio still starts.
 */
export async function applyStoredSettingsToEnv(
  env: EnvRecord,
  stored: StoredInstanceSettings,
  decrypt: Decrypt
): Promise<{ applied: InstanceSettingsGroup[]; failed: InstanceSettingsGroup[] }> {
  const builders: Record<InstanceSettingsGroup, () => Promise<EnvRecord | null>> = {
    sso: () => ssoVariables(stored.sso, decrypt),
    smtp: () => smtpVariables(stored.smtp, decrypt),
    domains: async () =>
      stored.allowedDomains?.length
        ? { ALLOWED_LOGIN_DOMAINS: stored.allowedDomains.join(',') }
        : null,
  }
  const applied: InstanceSettingsGroup[] = []
  const failed: InstanceSettingsGroup[] = []
  for (const group of ['sso', 'smtp', 'domains'] as const) {
    if (isSet(env[GROUP_KEY_VAR[group]])) continue
    let variables: EnvRecord | null
    try {
      variables = await builders[group]()
    } catch {
      failed.push(group)
      continue
    }
    if (!variables) continue
    for (const [name, value] of Object.entries(variables)) {
      if (value !== undefined && !isSet(env[name])) env[name] = value
    }
    applied.push(group)
  }
  env[FROM_SETTINGS_VAR] = applied.join(',')
  env[SETTINGS_REVISION_VAR] = String(stored.revision ?? 0)
  return { applied, failed }
}

/**
 * The instance organization's slug, as `getInstanceOrganizationConfig` derives it: the explicit
 * `INSTANCE_ORG_SLUG`, else the name with accents folded (« Société » yields `societe`).
 */
export function deriveInstanceOrganizationSlug(env: Partial<EnvRecord>): string | null {
  const explicit = env.INSTANCE_ORG_SLUG?.trim()
  if (explicit) return explicit
  const name = env.INSTANCE_ORG_NAME?.trim()
  if (!name) return null
  return slugify(name.normalize('NFD').replace(/[̀-ͯ]/g, '')) || null
}
