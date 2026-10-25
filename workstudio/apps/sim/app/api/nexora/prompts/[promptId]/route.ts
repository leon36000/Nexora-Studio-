import {
  deleteNexoraPromptContract,
  getNexoraPromptContract,
} from '@/lib/api/contracts/nexora-prompts'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deletePromptUseCase,
  getPromptDetailUseCase,
} from '@/lib/nexora/prompts/application/use-cases'
import { presentPromptDetail } from '@/app/api/nexora/prompts/surface'

export const dynamic = 'force-dynamic'

/** A prompt with every version, newest first. */
export const GET = defineInternalJsonRoute({
  contract: getNexoraPromptContract,
  operation: getPromptDetailUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when a prompt page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, promptRef: params.promptId }),
  useCase: getPromptDetailUseCase,
  present: ({ prompt }) => ({ prompt: presentPromptDetail(prompt) }),
})

/** Deletes a prompt and its versions: agents that use it fail with a clear message. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteNexoraPromptContract,
  operation: deletePromptUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.prompts.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, promptRef: params.promptId }),
  useCase: deletePromptUseCase,
  present: () => ({ success: true as const }),
})
