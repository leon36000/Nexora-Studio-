import { listKnowledgeEmbeddingModelsContract } from '@/lib/api/contracts/knowledge'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { internalKnowledgeErrorPolicies } from '@/lib/knowledge/api/route-policies'
import { knowledgeOperations } from '@/lib/knowledge/application/operations'
import { listKnowledgeEmbeddingModels } from '@/lib/knowledge/application/reindex'

export const GET = defineInternalJsonRoute({
  contract: listKnowledgeEmbeddingModelsContract,
  auth: internalSessionAuth,
  operation: knowledgeOperations.readReindex,
  rateLimit: internalRateLimits.none({ reason: 'Read when the base settings open' }),
  errorPolicy: internalKnowledgeErrorPolicies.read,
  mapInput: ({ params }) => ({ knowledgeBaseId: params.id }),
  useCase: listKnowledgeEmbeddingModels,
  present: (data) => ({ success: true as const, data }),
})
