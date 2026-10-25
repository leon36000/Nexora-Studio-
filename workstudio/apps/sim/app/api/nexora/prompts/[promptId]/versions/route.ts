import { createNexoraPromptVersionContract } from '@/lib/api/contracts/nexora-prompts'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { createPromptVersionUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { presentPromptSummary, presentPromptVersion } from '@/app/api/nexora/prompts/surface'

/** Saves the next version of a prompt; its labels stay where they were. */
export const POST = defineInternalJsonRoute({
  contract: createNexoraPromptVersionContract,
  operation: createPromptVersionUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.prompts.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ ...body, promptRef: params.promptId }),
  useCase: createPromptVersionUseCase,
  present: ({ prompt, version }) => ({
    prompt: presentPromptSummary(prompt),
    version: presentPromptVersion(version),
  }),
})
