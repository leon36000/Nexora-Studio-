import {
  deleteAssistantTaskContract,
  setAssistantTaskEnabledContract,
} from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { deleteAssistantTask, setAssistantTaskEnabled } from '@/lib/nexora/assistant/tasks'
import { assistantErrorPolicy, presentTask } from '@/app/api/nexora/assistant/surface'

const OWN_TASK_RATE_LIMIT = internalRateLimits.none({
  reason: 'Session-only change of one of the caller’s own tasks',
})

/** Turns the task’s schedule off, or on again. */
export const PATCH = defineInternalJsonRoute({
  contract: setAssistantTaskEnabledContract,
  operation: setAssistantTaskEnabled.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_TASK_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({ taskId: params.taskId, enabled: body.enabled }),
  useCase: setAssistantTaskEnabled,
  present: ({ task, schedule }) => ({ task: presentTask({ ...task, schedule }) }),
})

/** Deletes the task and the workflow behind it. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteAssistantTaskContract,
  operation: deleteAssistantTask.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_TASK_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ taskId: params.taskId }),
  useCase: deleteAssistantTask,
  present: () => ({ success: true as const }),
})
