import {
  createAssistantTaskContract,
  listAssistantTasksContract,
} from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { createAssistantTask, listAssistantTasks } from '@/lib/nexora/assistant/tasks'
import { assistantErrorPolicy, presentTask } from '@/app/api/nexora/assistant/surface'

/** The caller's own scheduled tasks in a workspace, newest first, with their schedules. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantTasksContract,
  operation: listAssistantTasks.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the caller’s own tasks, at most 50 rows',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantTasks,
  present: ({ tasks }) => ({ tasks: tasks.map(presentTask) }),
})

/** Creates the task a reviewed plan describes: its workflow, deployed, with its schedule. */
export const POST = defineInternalJsonRoute({
  contract: createAssistantTaskContract,
  operation: createAssistantTask.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({
    bucketName: 'nexora.assistant.tasks',
    config: { maxTokens: 10, refillRate: 10, refillIntervalMs: 60_000 },
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ body }) => ({
    workspaceId: body.workspaceId,
    request: body.request,
    plan: body.plan,
  }),
  useCase: createAssistantTask,
  present: ({ task, schedule, warnings }) => ({
    task: presentTask({ ...task, schedule }),
    warnings,
  }),
})
