import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** Requests per minute a key may be given: at least one, at most a hundred per second. */
export const NEXORA_API_KEY_MAX_RPM = 6000
export const NEXORA_API_KEY_DEFAULT_RPM = 60
/** A monthly cap: a whole number of tokens, at most a quadrillion. */
const MAX_MONTHLY_TOKENS = 1e15
/** A key expires at most ten years ahead. */
const MAX_EXPIRY_MS = 10 * 366 * 24 * 60 * 60 * 1000
const MAX_ALLOWED_MODELS = 100

const nexoraApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(['workspace', 'instance']),
  workspaceId: z.string().nullable(),
  /** The value's last characters, to tell keys apart. */
  keySuffix: z.string(),
  /** `null`: every model of the instance. */
  allowedModels: z.array(z.string()).nullable(),
  allowAgents: z.boolean(),
  monthlyTokenCap: z.number().nullable(),
  requestsPerMinute: z.number(),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** Who created it, for information: the key belongs to the workspace or the instance. */
  createdByName: z.string().nullable(),
  status: z.enum(['active', 'expired', 'revoked']),
  /** Use in the current calendar month (instance time zone). */
  usage: z.object({
    month: z.string(),
    requests: z.number(),
    totalTokens: z.number(),
  }),
})

export type NexoraApiKey = z.output<typeof nexoraApiKeySchema>

const keySettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'A key needs a name')
    .max(100, 'A key name is at most 100 characters'),
  expiresAt: z.iso
    .datetime({ error: 'expiresAt must be an ISO date' })
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || new Date(value).getTime() > Date.now(),
      'The expiry date must be in the future'
    )
    .refine(
      (value) => value === null || new Date(value).getTime() < Date.now() + MAX_EXPIRY_MS,
      'The expiry date is too far ahead'
    ),
  allowedModels: z
    .array(z.string().trim().min(1).max(200))
    .min(1, 'Choose at least one model, or allow every model')
    .max(MAX_ALLOWED_MODELS)
    .nullable()
    .default(null),
  monthlyTokenCap: z
    .number()
    .int('A cap is a whole number of tokens')
    .positive('A cap must be above zero')
    .max(MAX_MONTHLY_TOKENS)
    .nullable()
    .default(null),
  requestsPerMinute: z
    .number()
    .int()
    .min(1, 'At least one request per minute')
    .max(NEXORA_API_KEY_MAX_RPM, `At most ${NEXORA_API_KEY_MAX_RPM} requests per minute`)
    .default(NEXORA_API_KEY_DEFAULT_RPM),
})

const createdKeyResponseSchema = z.object({
  key: nexoraApiKeySchema,
  /** The key itself, returned this once and never again. */
  value: z.string(),
})

const keysResponseSchema = z.object({ keys: z.array(nexoraApiKeySchema) })

const createWorkspaceKeyBodySchema = keySettingsSchema.extend({
  workspaceId: workspaceIdSchema,
  allowAgents: z.boolean().default(true),
})

export type CreateWorkspaceNexoraApiKeyBody = z.input<typeof createWorkspaceKeyBodySchema>
export type CreateInstanceNexoraApiKeyBody = z.input<typeof keySettingsSchema>

/** A workspace's developer API keys (every member may read them). */
export const listWorkspaceNexoraApiKeysContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/api-keys',
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: keysResponseSchema },
})

/** Creates a workspace key: its models and published agents. Members who can edit. */
export const createWorkspaceNexoraApiKeyContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/api-keys',
  body: createWorkspaceKeyBodySchema,
  response: { mode: 'json', schema: createdKeyResponseSchema },
})

/** Revokes a workspace key: it answers 401 from then on. */
export const revokeWorkspaceNexoraApiKeyContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/api-keys/[keyId]',
  params: z.object({ keyId: z.string().min(1) }),
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ key: nexoraApiKeySchema }) },
})

/** The instance's keys (models only). Instance administrators. */
export const listInstanceNexoraApiKeysContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/api-keys/instance',
  response: { mode: 'json', schema: keysResponseSchema },
})

export const createInstanceNexoraApiKeyContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/api-keys/instance',
  body: keySettingsSchema,
  response: { mode: 'json', schema: createdKeyResponseSchema },
})

export const revokeInstanceNexoraApiKeyContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/api-keys/instance/[keyId]',
  params: z.object({ keyId: z.string().min(1) }),
  response: { mode: 'json', schema: z.object({ key: nexoraApiKeySchema }) },
})
