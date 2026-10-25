import {
  createAssistantProjectContract,
  listAssistantProjectsContract,
} from '@/lib/api/contracts/nexora-assistant-projects'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { createAssistantProject, listAssistantProjects } from '@/lib/nexora/assistant/projects'
import {
  assistantErrorPolicy,
  presentProject,
  presentProjectSummary,
} from '@/app/api/nexora/assistant/surface'

/** The caller's own projects in a workspace, most recently changed first. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantProjectsContract,
  operation: listAssistantProjects.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the caller’s own projects, at most 100 rows',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantProjects,
  present: ({ projects }) => ({ projects: projects.map(presentProjectSummary) }),
})

export const POST = defineInternalJsonRoute({
  contract: createAssistantProjectContract,
  operation: createAssistantProject.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ body }) => ({
    workspaceId: body.workspaceId,
    name: body.name,
    instructions: body.instructions,
  }),
  useCase: createAssistantProject,
  present: ({ project }) => ({ project: presentProject(project) }),
})
