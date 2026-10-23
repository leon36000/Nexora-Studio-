import { z } from 'zod'
import { workflowIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

const workflowEditAccessBodySchema = z.object({
  workflowId: workflowIdSchema,
  userId: z.string().min(1, 'userId is required').max(255),
})

const workflowEditAccessResponseSchema = z.object({
  /** Whether the user's permission group withholds `workflows.edit` in the workflow's workspace. */
  withheld: z.boolean(),
})

/**
 * Internal, `x-api-key`-gated: the realtime server asks whether a socket user's permission group
 * withholds workflow editing before it lets that socket write a workflow. Permission groups live
 * behind the app's billing and access-control graph, which the realtime server must not import.
 * The caller has already established the user's workspace role; this answers the group alone.
 */
export const workflowEditAccessContract = defineRouteContract({
  method: 'POST',
  path: '/api/internal/workflow-edit-access',
  body: workflowEditAccessBodySchema,
  response: {
    mode: 'json',
    schema: workflowEditAccessResponseSchema,
  },
})
