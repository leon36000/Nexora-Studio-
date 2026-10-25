import {
  extendInternalErrorPolicy,
  internalErrorResponse,
  internalOrchestrationErrorPolicy,
} from '@/lib/api/server/routes'
import {
  AssistantAgentUnpublishedError,
  type AssistantConversationRecord,
  type AssistantMessageRecord,
} from '@/lib/nexora/assistant'
import { CopilotGenerationError, CopilotPlanError } from '@/lib/nexora/copilot'
import {
  AssistantTaskPlanError,
  describeCron,
  type TaskSchedule,
  type TaskWithSchedule,
} from '@/lib/nexora/assistant/tasks'
import {
  AssistantProjectRefusedError,
  type ProjectFileRecord,
  type ProjectRecord,
  type ProjectSummary,
} from '@/lib/nexora/assistant/projects'

/**
 * The Assistant routes' errors: an unpublished agent is a 409 carrying the code the page branches
 * on; everything else follows the orchestration classes (another member's conversation is a 404,
 * a workspace without access a 403).
 */
export const assistantErrorPolicy = extendInternalErrorPolicy(
  internalOrchestrationErrorPolicy,
  (error) => {
    if (error instanceof AssistantAgentUnpublishedError) {
      return internalErrorResponse(409, { error: error.message, code: error.reason })
    }
    if (error instanceof AssistantProjectRefusedError) {
      return internalErrorResponse(400, { error: error.message, code: error.reason })
    }
    if (error instanceof AssistantTaskPlanError) {
      return internalErrorResponse(error.reason === 'no-schedule' ? 422 : 500, {
        error: error.message,
        code: error.reason,
      })
    }
    // The Copilot plans a task: its failures carry the codes the Copilot page already words.
    if (error instanceof CopilotGenerationError) {
      return internalErrorResponse(error.code === 'unavailable' ? 503 : 422, {
        error: error.detail,
        code: error.code,
      })
    }
    if (error instanceof CopilotPlanError) {
      return internalErrorResponse(422, { error: error.detail, code: 'plan-invalid' })
    }
    return null
  }
)

export function presentConversation(conversation: AssistantConversationRecord) {
  return {
    id: conversation.id,
    workspaceId: conversation.workspaceId,
    workflowId: conversation.workflowId,
    title: conversation.title,
    projectId: conversation.projectId,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }
}

export function presentProject(project: ProjectRecord) {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    instructions: project.instructions,
    version: project.version,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export function presentProjectSummary(project: ProjectSummary) {
  return { ...presentProject(project), fileCount: project.fileCount }
}

export function presentProjectFile(file: ProjectFileRecord) {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  }
}

function presentSchedule(schedule: TaskSchedule) {
  return {
    status: schedule.status,
    cronExpression: schedule.cronExpression,
    label: schedule.cronExpression ? describeCron(schedule.cronExpression) : '',
    timezone: schedule.timezone,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastRanAt: schedule.lastRanAt?.toISOString() ?? null,
  }
}

export function presentTask(task: TaskWithSchedule) {
  return {
    id: task.id,
    workflowId: task.workflowId,
    title: task.title,
    request: task.request,
    createdAt: task.createdAt.toISOString(),
    schedule: task.schedule ? presentSchedule(task.schedule) : null,
  }
}

export function presentMessage(message: AssistantMessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    files: (message.files ?? []).map(({ name, type, size }) => ({ name, type, size })),
    usage: message.usage,
    interrupted: message.interrupted,
    createdAt: message.createdAt.toISOString(),
  }
}
