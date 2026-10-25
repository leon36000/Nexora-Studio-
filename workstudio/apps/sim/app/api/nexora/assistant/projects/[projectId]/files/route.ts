import { addAssistantProjectFileContract } from '@/lib/api/contracts/nexora-assistant-projects'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { addAssistantProjectFile } from '@/lib/nexora/assistant/projects'
import { assistantErrorPolicy, presentProjectFile } from '@/app/api/nexora/assistant/surface'

/** Adds a file to one of the caller's projects; the project keeps its text, not the file. */
export const POST = defineInternalJsonRoute({
  contract: addAssistantProjectFileContract,
  operation: addAssistantProjectFile.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({
    projectId: params.projectId,
    file: { name: body.name, type: body.type, data: body.data },
  }),
  useCase: addAssistantProjectFile,
  present: ({ file }) => ({ file: presentProjectFile(file) }),
})
