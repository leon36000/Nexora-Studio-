// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { z } from 'zod'
import { ACCESS_REQUEST_TARGET_KINDS } from '@/ee/access-requests/lib/targets'

/** Minimal persisted shapes; the feature is disabled so these only describe empty/never-written data. */
export const storedAccessRequestTargetSchema = z.object({
  kind: z.enum(ACCESS_REQUEST_TARGET_KINDS),
  key: z.string().min(1).max(2048),
  label: z.string().max(512).optional(),
})

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
