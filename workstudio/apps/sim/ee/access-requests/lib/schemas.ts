// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { z } from 'zod'
import type { ACCESS_REQUEST_TARGET_KINDS } from '@/ee/access-requests/lib/targets'

/**
 * Minimal persisted shapes; the feature is disabled so these only describe empty/never-written data.
 *
 * A target is discriminated by `kind` and is strict: core call sites address a feature by its
 * permission-group `configKey` (`{ kind: 'feature', configKey: 'hideTablesTab' }`) and an
 * integration by its block id (`{ kind: 'integration', id: requestedBlock.type }`); a member
 * credit cap names nothing beyond its kind. Unknown kinds and extra fields are rejected.
 */
const targetIdSchema = z.string().min(1).max(2048)

export const storedAccessRequestTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('feature'), configKey: targetIdSchema }).strict(),
  z.object({ kind: z.literal('integration'), id: targetIdSchema }).strict(),
  z.object({ kind: z.literal('model'), id: targetIdSchema }).strict(),
  z.object({ kind: z.literal('tool'), id: targetIdSchema }).strict(),
  z.object({ kind: z.literal('capability'), id: targetIdSchema }).strict(),
  z.object({ kind: z.literal('usage_limit') }).strict(),
]) satisfies z.ZodType<{ kind: (typeof ACCESS_REQUEST_TARGET_KINDS)[number] }>

export const storedAccessRequestPolicyValueSchema = z.union([
  z.boolean(),
  z.array(z.string()),
  z.string(),
  z.null(),
])

export const storedAccessRequestPolicyChangeSchema = z.object({
  key: z.string(),
  from: storedAccessRequestPolicyValueSchema,
  to: storedAccessRequestPolicyValueSchema,
})

export const storedAccessRequestDecisionSchema = z.object({
  changes: z.array(storedAccessRequestPolicyChangeSchema),
  impact: z
    .object({
      affectedMembers: z.number().int().nonnegative(),
      affectedWorkspaces: z.number().int().nonnegative(),
    })
    .nullable(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
})
