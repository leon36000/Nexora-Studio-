import { z } from 'zod'
import { folderIdSchema, workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'

/** Longest automation description (or change request) the Copilot accepts. */
const DESCRIPTION_MAX_LENGTH = 4000

const generateCopilotPlanBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  description: z
    .string()
    .trim()
    .min(1, 'description is required')
    .max(
      DESCRIPTION_MAX_LENGTH,
      `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`
    ),
  /** The plan to modify: `description` then says what to change. */
  currentPlan: copilotPlanSchema.optional(),
})

export type GenerateCopilotPlanBody = z.input<typeof generateCopilotPlanBodySchema>

/**
 * Asks the Nexora model for a workflow plan (nothing is created). Errors carry a `code`:
 * `plan-invalid` (422, the model's plan stayed invalid after one retry), `rejected` (422, the model
 * refused the request) or `unavailable` (503).
 */
export const generateCopilotPlanContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/copilot/plan',
  body: generateCopilotPlanBodySchema,
  response: {
    mode: 'json',
    schema: z.object({
      plan: copilotPlanSchema,
      /** The trigger, then each step, as one French sentence each. */
      summary: z.array(z.string()),
      /** Unknown services or knowledge bases the workflow will ignore. */
      warnings: z.array(z.string()),
    }),
  },
})

const createCopilotWorkflowBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  plan: copilotPlanSchema,
  /** The folder to create the workflow in; the workspace root when omitted. */
  folderId: folderIdSchema.optional(),
})

export type CreateCopilotWorkflowBody = z.input<typeof createCopilotWorkflowBodySchema>

/**
 * Compiles a plan into a workflow named after its title. A plan that cannot compile answers 422
 * with the `plan-invalid` code.
 */
export const createCopilotWorkflowContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/copilot/create',
  body: createCopilotWorkflowBodySchema,
  response: {
    mode: 'json',
    schema: z.object({
      workflowId: z.string(),
      warnings: z.array(z.string()),
    }),
  },
})
