import {
  createNexoraPromptContract,
  listNexoraPromptsContract,
} from '@/lib/api/contracts/nexora-prompts'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { createPromptUseCase, listPromptsUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { presentPromptSummary } from '@/app/api/nexora/prompts/surface'

export const dynamic = 'force-dynamic'

/** The Prompts page, the agent form and the Agent block: the workspace's prompts. */
export const GET = defineInternalJsonRoute({
  contract: listNexoraPromptsContract,
  operation: listPromptsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Read issued when the Prompts page or a picker opens',
  }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listPromptsUseCase,
  present: ({ data }) => ({ prompts: data.map(presentPromptSummary) }),
})

/** Creates a prompt with its version 1, labelled production and test. */
export const POST = defineInternalJsonRoute({
  contract: createNexoraPromptContract,
  operation: createPromptUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.prompts.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: createPromptUseCase,
  present: ({ prompt }) => ({ prompt: presentPromptSummary(prompt) }),
})
