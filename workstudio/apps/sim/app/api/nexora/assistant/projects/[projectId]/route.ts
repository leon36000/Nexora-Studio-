import {
  deleteAssistantProjectContract,
  getAssistantProjectContract,
  updateAssistantProjectContract,
} from '@/lib/api/contracts/nexora-assistant-projects'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteAssistantProject,
  getAssistantProject,
  updateAssistantProject,
} from '@/lib/nexora/assistant/projects'
import {
  assistantErrorPolicy,
  presentProject,
  presentProjectFile,
} from '@/app/api/nexora/assistant/surface'

const OWN_PROJECT_RATE_LIMIT = internalRateLimits.none({
  reason: 'Session-only access to one of the caller’s own projects',
})

/** One of the caller's projects with its files. */
export const GET = defineInternalJsonRoute({
  contract: getAssistantProjectContract,
  operation: getAssistantProject.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_PROJECT_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ projectId: params.projectId }),
  useCase: getAssistantProject,
  present: ({ project, files }) => ({
    project: presentProject(project),
    files: files.map(presentProjectFile),
  }),
})

export const PATCH = defineInternalJsonRoute({
  contract: updateAssistantProjectContract,
  operation: updateAssistantProject.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({
    projectId: params.projectId,
    name: body.name,
    instructions: body.instructions,
  }),
  useCase: updateAssistantProject,
  present: ({ project }) => ({ project: presentProject(project) }),
})

/** Deletes the project and its files; its conversations stay, outside any project. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteAssistantProjectContract,
  operation: deleteAssistantProject.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_PROJECT_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ projectId: params.projectId }),
  useCase: deleteAssistantProject,
  present: () => ({ success: true as const }),
})
