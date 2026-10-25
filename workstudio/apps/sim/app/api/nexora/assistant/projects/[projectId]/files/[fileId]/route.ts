import { deleteAssistantProjectFileContract } from '@/lib/api/contracts/nexora-assistant-projects'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { deleteAssistantProjectFile } from '@/lib/nexora/assistant/projects'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

export const DELETE = defineInternalJsonRoute({
  contract: deleteAssistantProjectFileContract,
  operation: deleteAssistantProjectFile.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only removal of a file of one of the caller’s own projects',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ projectId: params.projectId, fileId: params.fileId }),
  useCase: deleteAssistantProjectFile,
  present: () => ({ success: true as const }),
})
