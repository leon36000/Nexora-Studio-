import { listEvalImportSourcesContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listImportSourcesUseCase } from '@/lib/nexora/evaluations/application/use-cases'

export const dynamic = 'force-dynamic'

/** What the member can import a test set from. */
export const GET = defineInternalJsonRoute({
  contract: listEvalImportSourcesContract,
  operation: listImportSourcesUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listImportSourcesUseCase,
  present: ({ tables, traces, conversations }) => ({
    tables,
    conversations: conversations.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })),
    traces: traces.map((t) => ({ ...t, startedAt: t.startedAt.toISOString() })),
  }),
})
