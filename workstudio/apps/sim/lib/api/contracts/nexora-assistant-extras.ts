import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { copilotPlanSchema } from '@/lib/nexora/copilot/plan'

const assistantSkillSchema = z.object({ name: z.string(), description: z.string() })
export type AssistantSkill = z.output<typeof assistantSkillSchema>

/** The workspace's skills, by name and description, for the `@` picker (read-only). */
export const listAssistantSkillsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/skills',
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ skills: z.array(assistantSkillSchema) }) },
})

const taskIdParamsSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required').max(128, 'Task ID is too long'),
})

/** What the member said they want (« tous les matins à 8 h, résume mes e-mails »). */
const taskRequestSchema = z
  .string()
  .trim()
  .min(1, 'request is required')
  .max(2000, 'request is too long')

/** The codes a task that cannot be planned or created answers with. */
export const ASSISTANT_TASK_ERROR_CODES = ['no-schedule', 'deploy-failed'] as const

const taskScheduleSchema = z.object({
  status: z.string(),
  cronExpression: z.string().nullable(),
  /** The cron expression as a French sentence. */
  label: z.string(),
  timezone: z.string(),
  nextRunAt: z.string().nullable(),
  lastRanAt: z.string().nullable(),
})

const assistantTaskSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  title: z.string(),
  request: z.string(),
  createdAt: z.string(),
  /** `null` when the schedule is gone (the workflow was undeployed in the editor). */
  schedule: taskScheduleSchema.nullable(),
})
export type AssistantTask = z.output<typeof assistantTaskSchema>

const assistantTaskRunSchema = z.object({
  executionId: z.string(),
  status: z.string(),
  trigger: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  output: z.string().nullable(),
})
export type AssistantTaskRun = z.output<typeof assistantTaskRunSchema>

export const planAssistantTaskContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/tasks/plan',
  body: z.object({ workspaceId: workspaceIdSchema, request: taskRequestSchema }),
  response: {
    mode: 'json',
    schema: z.object({
      plan: copilotPlanSchema,
      /** The trigger, then each step, as one French sentence each. */
      summary: z.array(z.string()),
      warnings: z.array(z.string()),
      /** When the task will run, as a French sentence. */
      schedule: z.string(),
    }),
  },
})

export const listAssistantTasksContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/tasks',
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ tasks: z.array(assistantTaskSchema) }) },
})

export const createAssistantTaskContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/assistant/tasks',
  body: z.object({
    workspaceId: workspaceIdSchema,
    request: taskRequestSchema,
    plan: copilotPlanSchema,
  }),
  response: {
    mode: 'json',
    schema: z.object({ task: assistantTaskSchema, warnings: z.array(z.string()) }),
    status: 201,
  },
})

export const setAssistantTaskEnabledContract = defineRouteContract({
  method: 'PATCH',
  path: '/api/nexora/assistant/tasks/[taskId]',
  params: taskIdParamsSchema,
  body: z.object({ enabled: z.boolean() }),
  response: { mode: 'json', schema: z.object({ task: assistantTaskSchema }) },
})

export const deleteAssistantTaskContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/assistant/tasks/[taskId]',
  params: taskIdParamsSchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const listAssistantTaskRunsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/assistant/tasks/[taskId]/runs',
  params: taskIdParamsSchema,
  response: { mode: 'json', schema: z.object({ runs: z.array(assistantTaskRunSchema) }) },
})
