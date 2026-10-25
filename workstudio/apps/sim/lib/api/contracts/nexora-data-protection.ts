import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** What happens to personal data sent to a model outside this server. */
const personalDataModeSchema = z.enum(['allow', 'mask', 'refuse'])

/** Workspaces the screen can hold a mode for in one save. */
const MAX_WORKSPACE_MODES = 500

const nexoraDataProtectionResponseSchema = z.object({
  policy: z.object({
    defaultMode: personalDataModeSchema,
    /** The mode of a workspace that has its own; the others follow `defaultMode`. */
    workspaceModes: z.record(z.string(), personalDataModeSchema),
  }),
  /** Every workspace of the instance, by name. */
  workspaces: z.array(
    z.object({ id: z.string(), name: z.string(), status: z.enum(['active', 'archived']) })
  ),
  /** The local personal-data service (profile « pii »). Without it, only patterns mask. */
  service: z.object({ configured: z.boolean(), reachable: z.boolean() }),
})

const updateNexoraDataProtectionBodySchema = z
  .object({
    defaultMode: personalDataModeSchema.optional(),
    /** A `null` mode removes that workspace's own mode. */
    workspaceModes: z
      .record(workspaceIdSchema, personalDataModeSchema.nullable())
      .refine((modes) => Object.keys(modes).length <= MAX_WORKSPACE_MODES, {
        message: `At most ${MAX_WORKSPACE_MODES} workspace modes can be changed at once`,
      })
      .optional(),
  })
  .refine((change) => change.defaultMode !== undefined || change.workspaceModes !== undefined, {
    message: 'Nothing to change',
  })

export type UpdateNexoraDataProtectionBody = z.input<typeof updateNexoraDataProtectionBodySchema>

/** The personal-data policy of the instance and of its workspaces (Nexora edition, instance admins). */
export const getNexoraDataProtectionContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/data-protection',
  response: { mode: 'json', schema: nexoraDataProtectionResponseSchema },
})

export const updateNexoraDataProtectionContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/data-protection',
  body: updateNexoraDataProtectionBodySchema,
  response: { mode: 'json', schema: nexoraDataProtectionResponseSchema },
})
