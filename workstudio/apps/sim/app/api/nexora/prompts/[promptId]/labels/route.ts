import { moveNexoraPromptLabelContract } from '@/lib/api/contracts/nexora-prompts'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { movePromptLabelUseCase } from '@/lib/nexora/prompts/application/use-cases'
import { presentPromptSummary } from '@/app/api/nexora/prompts/surface'

/** Points production or test at a version: agents using the label read it on their next run. */
export const PUT = defineInternalJsonRoute({
  contract: moveNexoraPromptLabelContract,
  operation: movePromptLabelUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.prompts.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ ...body, promptRef: params.promptId }),
  useCase: movePromptLabelUseCase,
  present: ({ prompt }) => ({ prompt: presentPromptSummary(prompt) }),
})
