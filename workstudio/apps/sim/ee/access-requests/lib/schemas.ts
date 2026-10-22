// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { z } from 'zod'
import { PERMISSION_GROUP_RESTRICTION_KEYS } from '@/lib/permission-groups/fields'
import type { ACCESS_REQUEST_TARGET_KINDS } from '@/ee/access-requests/lib/targets'

/**
 * Minimal persisted shapes; the feature is disabled so these only describe empty/never-written data.
 * Field names follow the core contracts and their OpenAPI examples.
 *
 * A target is discriminated by `kind` and is strict: core call sites address a feature by its
 * permission-group `configKey` (`{ kind: 'feature', configKey: 'hideTablesTab' }`) and an
 * integration by its block id (`{ kind: 'integration', id: requestedBlock.type }`); a member
 * credit cap names nothing beyond its kind. Unknown kinds and extra fields are rejected.
 */
const targetIdSchema = z
  .string()
  .min(1)
  .max(2048)
  .describe('Identifier returned by access discovery.')

function targetKind<const K extends (typeof ACCESS_REQUEST_TARGET_KINDS)[number]>(kind: K) {
  return z.literal(kind).describe('Kind of access being requested.')
}

export const storedAccessRequestTargetSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: targetKind('feature'),
      configKey: targetIdSchema.describe('Feature restriction key returned by access discovery.'),
    })
    .strict(),
  z.object({ kind: targetKind('integration'), id: targetIdSchema }).strict(),
  z.object({ kind: targetKind('model'), id: targetIdSchema }).strict(),
  z.object({ kind: targetKind('tool'), id: targetIdSchema }).strict(),
  z.object({ kind: targetKind('capability'), id: targetIdSchema }).strict(),
  z.object({ kind: targetKind('usage_limit') }).strict(),
]) satisfies z.ZodType<{ kind: (typeof ACCESS_REQUEST_TARGET_KINDS)[number] }>

export const storedAccessRequestPolicyValueSchema = z
  .union([z.boolean(), z.array(z.string()), z.string(), z.null()])
  .describe('Restriction value: a flag, a list of allowed or denied ids, or null for no limit.')

/** Shape of a proposed change, as the core preview example writes it. */
export const storedAccessRequestPolicyChangeSchema = z
  .object({
    configKey: z
      .enum(PERMISSION_GROUP_RESTRICTION_KEYS)
      .describe('Permission restriction changed by approval.'),
    label: z.string().min(1).max(512).describe('Human-readable permission name.'),
    before: storedAccessRequestPolicyValueSchema.describe('Current value of the restriction.'),
    after: storedAccessRequestPolicyValueSchema.describe('Value after applying the request.'),
  })
  .strict()

export const storedAccessRequestDecisionSchema = z.object({
  changes: z
    .array(storedAccessRequestPolicyChangeSchema)
    .describe('Permission changes proposed for the governing group.'),
  impact: z
    .object({
      memberCount: z.number().int().nonnegative().describe('Number of affected members.'),
      workspaceCount: z.number().int().nonnegative().describe('Number of affected workspaces.'),
      workspaceNames: z.array(z.string()).describe('Names of affected workspaces.'),
      truncated: z
        .boolean()
        .describe('Whether the workspace-name list is truncated; counts include the full impact.'),
    })
    .strict()
    .nullable()
    .describe('Members and workspaces affected by approval.'),
  group: z
    .object({
      id: z.string().min(1).max(128).describe('Governing group identifier.'),
      name: z.string().describe('Governing group name.'),
    })
    .strict()
    .nullable()
    .describe('Group affected by a permission approval; null for credit-cap changes.'),
})
