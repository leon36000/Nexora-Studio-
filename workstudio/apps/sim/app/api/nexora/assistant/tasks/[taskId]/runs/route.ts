import { listAssistantTaskRunsContract } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listAssistantTaskRuns } from '@/lib/nexora/assistant/tasks'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/** The task’s last runs with their results: only its owner reads them. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantTaskRunsContract,
  operation: listAssistantTaskRuns.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the last ten runs of one of the caller’s own tasks',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ taskId: params.taskId }),
  useCase: listAssistantTaskRuns,
  present: ({ runs }) => ({
    runs: runs.map((run) => ({
      executionId: run.executionId,
      status: run.status,
      trigger: run.trigger,
      startedAt: run.startedAt.toISOString(),
      endedAt: run.endedAt?.toISOString() ?? null,
      output: run.output,
    })),
  }),
})
