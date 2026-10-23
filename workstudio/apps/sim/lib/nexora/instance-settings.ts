import { AuditAction, AuditResourceType, recordAudit } from '@sim/audit'
import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { isRecordLike, omit, toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/core/config/env'
import { encryptSecret } from '@/lib/core/security/encryption'
import { envOverrides, SETTINGS_REVISION_VAR } from '@/lib/nexora/instance-settings-env'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: instance settings an administrator sets in the interface (single sign-on,
 * e-mail, sign-up domains), kept in the instance organization's metadata with secrets encrypted.
 * WorkStudio applies them when it starts (`instance-settings-env.ts`); deploy/.env always wins:
 * a group set there is used, and the screen says so.
 */
interface StoredSso {
  issuer: string
  clientId: string
  /** Encrypted. */
  clientSecret?: string
  buttonName?: string
  /** Members sign in through the identity provider only; owners and admins keep their password. */
  required?: boolean
}

interface StoredSmtp {
  host: string
  port: number
  user?: string
  /** Encrypted. */
  password?: string
  from?: string
}

export interface StoredInstanceSettings {
  /** Incremented on every change; the running process records the one it started with. */
  revision?: number
  sso?: StoredSso
  smtp?: StoredSmtp
  allowedDomains?: string[]
}

/** A change from the settings screen: an empty secret keeps the stored one, `null` clears a section. */
export interface InstanceSettingsChange {
  sso?: (Omit<StoredSso, 'clientSecret'> & { clientSecret?: string }) | null
  smtp?: SmtpDraft | null
  allowedDomains?: string[]
}

/** SMTP typed on the screen; an empty password stands for the stored one. */
type SmtpDraft = Omit<StoredSmtp, 'password'> & { password?: string }

interface ResolvedSmtp {
  host: string
  port: number
  user?: string
  password?: string
  from?: string
}

type EnvReader = Partial<Record<string, string | number | boolean | undefined>>
type Encrypt = (secret: string) => Promise<string>
type Decrypt = (value: string) => Promise<string>

const METADATA_KEY = 'nexoraSettings'

function text(value: EnvReader[string]): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringEnv(environment: EnvReader): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(environment).map(([key, value]) => [
      key,
      value === undefined ? undefined : String(value),
    ])
  )
}

function normalizeDomains(domains: string[]): string[] {
  return [
    ...new Set(
      domains.map((domain) => domain.trim().toLowerCase().replace(/^@/, '')).filter(Boolean)
    ),
  ]
}

export async function applySettingsChange(
  stored: StoredInstanceSettings,
  change: InstanceSettingsChange,
  encrypt: Encrypt
): Promise<StoredInstanceSettings> {
  let next: StoredInstanceSettings = { ...stored, revision: (stored.revision ?? 0) + 1 }
  if (change.sso === null) next = omit(next, ['sso'])
  else if (change.sso) {
    const { clientSecret, ...rest } = change.sso
    next.sso = {
      ...rest,
      clientSecret: clientSecret ? await encrypt(clientSecret) : stored.sso?.clientSecret,
    }
  }
  if (change.smtp === null) next = omit(next, ['smtp'])
  else if (change.smtp) {
    const { password, ...rest } = change.smtp
    next.smtp = { ...rest, password: password ? await encrypt(password) : stored.smtp?.password }
  }
  if (change.allowedDomains) next.allowedDomains = normalizeDomains(change.allowedDomains)
  return next
}

/**
 * What the settings screen may show: no secret, only whether one is set, what deploy/.env
 * overrides, and whether the running instance started with an older revision.
 */
export function publicSettings(stored: StoredInstanceSettings, environment: EnvReader) {
  const { clientSecret, ...sso } = stored.sso ?? { issuer: '', clientId: '' }
  const { password, ...smtp } = stored.smtp ?? { host: '', port: 0 }
  return {
    sso: stored.sso ? { ...sso, hasSecret: Boolean(clientSecret) } : null,
    smtp: stored.smtp ? { ...smtp, hasPassword: Boolean(password) } : null,
    allowedDomains: stored.allowedDomains ?? [],
    envOverrides: envOverrides(stringEnv(environment)),
    pendingApply: (stored.revision ?? 0) !== (Number(environment[SETTINGS_REVISION_VAR]) || 0),
  }
}

/**
 * The SMTP server to use: deploy/.env when it sets one, else `draft` (what the screen holds, for
 * a test before saving), else the stored settings. Secrets are decrypted on use.
 */
export async function resolveSmtp(
  environment: EnvReader,
  stored: StoredInstanceSettings,
  decrypt: Decrypt,
  draft?: SmtpDraft
): Promise<ResolvedSmtp | null> {
  if (envOverrides(stringEnv(environment)).smtp) {
    return {
      host: text(environment.SMTP_HOST),
      port: Number(environment.SMTP_PORT) || 587,
      user: text(environment.SMTP_USER) || undefined,
      password: text(environment.SMTP_PASS) || undefined,
      from: text(environment.FROM_EMAIL_ADDRESS) || undefined,
    }
  }
  if (draft) {
    const { password, ...rest } = draft
    const storedPassword = stored.smtp?.password
    if (password) return { ...rest, password }
    return storedPassword ? { ...rest, password: await decrypt(storedPassword) } : rest
  }
  if (!stored.smtp?.host) return null
  const { password, ...rest } = stored.smtp
  return { ...rest, ...(password ? { password: await decrypt(password) } : {}) }
}

function parseStored(metadata: unknown): StoredInstanceSettings {
  const stored = toRecord(metadata)[METADATA_KEY]
  return isRecordLike(stored) ? (stored as StoredInstanceSettings) : {}
}

/** The stored settings, or `null` when the instance has no instance organization to hold them. */
export async function readInstanceSettings(): Promise<StoredInstanceSettings | null> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return null
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return parseStored(row?.metadata)
}

/** Applies a change under a row lock; other metadata keys are kept. */
async function updateInstanceSettings(
  change: InstanceSettingsChange
): Promise<StoredInstanceSettings | null> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return null
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const next = await applySettingsChange(parseStored(row?.metadata), change, async (secret) => {
      return (await encryptSecret(secret)).encrypted
    })
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row?.metadata), [METADATA_KEY]: next } })
      .where(eq(organization.id, organizationId))
    return next
  })
}

/** The deploy/.env values the settings compare against, read once per request. */
export function settingsEnvironment(): Record<string, string | undefined> {
  return {
    NEXORA_OIDC_ISSUER: env.NEXORA_OIDC_ISSUER,
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT === undefined ? undefined : String(env.SMTP_PORT),
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    FROM_EMAIL_ADDRESS: env.FROM_EMAIL_ADDRESS,
    ALLOWED_LOGIN_DOMAINS: env.ALLOWED_LOGIN_DOMAINS,
    NEXORA_SETTINGS_FROM_DB: env.NEXORA_SETTINGS_FROM_DB,
    NEXORA_SETTINGS_REVISION: env.NEXORA_SETTINGS_REVISION,
  }
}

interface SettingsActor {
  userId: string
  organizationId: string
  request?: { headers: { get(name: string): string | null } }
}

/** Which sections a change touches, for the audit log (never a value: secrets stay out). */
function changedSections(change: InstanceSettingsChange): string[] {
  return (['sso', 'smtp', 'allowedDomains'] as const).flatMap((section) =>
    change[section] === undefined ? [] : [change[section] === null ? `${section}:cleared` : section]
  )
}

/** Saves a change from the settings screen and records it in the audit log. */
export async function saveInstanceSettings(
  change: InstanceSettingsChange,
  actor: SettingsActor
): Promise<StoredInstanceSettings | null> {
  const next = await updateInstanceSettings(change)
  if (next) {
    recordAudit({
      actorId: actor.userId,
      action: AuditAction.INSTANCE_SETTINGS_UPDATED,
      resourceType: AuditResourceType.ORGANIZATION,
      resourceId: actor.organizationId,
      description: 'Updated instance settings',
      metadata: { sections: changedSections(change), revision: next.revision },
      request: actor.request,
    })
  }
  return next
}

/** Records that an administrator restarted WorkStudio to apply the saved settings. */
export function recordSettingsApplied(actor: SettingsActor, revision: number): void {
  recordAudit({
    actorId: actor.userId,
    action: AuditAction.INSTANCE_SETTINGS_APPLIED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: actor.organizationId,
    description: 'Restarted WorkStudio to apply instance settings',
    metadata: { revision },
    request: actor.request,
  })
}
