import type { SessionPrincipal } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { readProjectFile } from '@/lib/nexora/assistant/projects/file-text'
import {
  addProjectFile,
  deleteProject,
  deleteProjectFile,
  insertProject,
  listProjectFiles,
  listProjects,
  loadProject,
  type ProjectRecord,
  updateProject,
} from '@/lib/nexora/assistant/projects/repository'
import {
  type ActiveWorkspaceApplicationContext,
  resolveActiveWorkspaceApplicationContext,
} from '@/lib/workspaces/application/context'

/**
 * A file the project cannot take: the reason is one of `unsupported`, `unreadable`, `empty`,
 * `too-large` (the file) or `project-full` (too many files, or too much text altogether).
 */
export class AssistantProjectRefusedError extends OrchestrationError {
  constructor(readonly reason: string) {
    super('validation', `The project cannot take this file (${reason})`)
    this.name = 'AssistantProjectRefusedError'
  }
}

interface WorkspaceInput {
  workspaceId: string
}

interface CreateProjectInput extends WorkspaceInput {
  name: string
  instructions?: string
}

interface ProjectInput {
  projectId: string
}

interface UpdateProjectInput extends ProjectInput {
  name?: string
  instructions?: string
}

interface AddFileInput extends ProjectInput {
  file: { name: string; type: string; data: string }
}

interface DeleteFileInput extends ProjectInput {
  fileId: string
}

interface OwnedProjectContext extends ActiveWorkspaceApplicationContext {
  project: ProjectRecord
}

function projectNotFound(): never {
  throw new OrchestrationError('not_found', 'Project not found')
}

/**
 * Another member's project is not found, exactly like a missing one, and is answered before the
 * workspace is authorized so nothing about it is revealed.
 */
async function resolveOwnedProjectContext(
  principal: SessionPrincipal,
  projectId: string
): Promise<OwnedProjectContext> {
  const project = await loadProject(projectId)
  if (!project || project.userId !== principal.userId) projectNotFound()
  return {
    ...(await resolveActiveWorkspaceApplicationContext(project.workspaceId)),
    project,
  }
}

function ownedProjectContext({
  principal,
  input,
}: {
  principal: SessionPrincipal
  input: ProjectInput
}) {
  return resolveOwnedProjectContext(principal, input.projectId)
}

export const listAssistantProjects = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listProjects,
  resolveContext: ({ input }: { input: WorkspaceInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ principal, context }) => ({
    projects: await listProjects(context.workspaceId, principal.userId),
  }),
})

export const createAssistantProject = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.createProject,
  resolveContext: ({ input }: { input: CreateProjectInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ principal, context, input }) => ({
    project: await insertProject({
      workspaceId: context.workspaceId,
      userId: principal.userId,
      name: input.name,
      instructions: input.instructions ?? '',
    }),
  }),
})

export const getAssistantProject = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.readProject,
  resolveContext: ownedProjectContext,
  authorizationOptions: {},
  execute: async ({ context }) => ({
    project: context.project,
    files: await listProjectFiles(context.project.id),
  }),
})

export const updateAssistantProject = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.updateProject,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: UpdateProjectInput
  }) => resolveOwnedProjectContext(principal, input.projectId),
  authorizationOptions: {},
  async execute({ context, input }) {
    const project = await updateProject(context.project.id, {
      name: input.name,
      instructions: input.instructions,
    })
    if (!project) projectNotFound()
    return { project }
  },
})

export const deleteAssistantProject = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.deleteProject,
  resolveContext: ownedProjectContext,
  authorizationOptions: {},
  async execute({ context }) {
    if (!(await deleteProject(context.project.id))) projectNotFound()
    return { projectId: context.project.id }
  },
})

/** Reads the file's text and keeps it with the project; a file the project cannot take is refused. */
export const addAssistantProjectFile = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.addProjectFile,
  resolveContext: ({ principal, input }: { principal: SessionPrincipal; input: AddFileInput }) =>
    resolveOwnedProjectContext(principal, input.projectId),
  authorizationOptions: {},
  async execute({ context, input }) {
    const reading = await readProjectFile(input.file)
    if (!reading.ok) throw new AssistantProjectRefusedError(reading.reason)
    const outcome = await addProjectFile(context.project.id, {
      name: input.file.name,
      type: input.file.type || 'application/octet-stream',
      size: reading.size,
      text: reading.text,
    })
    if (outcome.status === 'gone') projectNotFound()
    if (outcome.status === 'full') throw new AssistantProjectRefusedError('project-full')
    return { file: outcome.file }
  },
})

export const deleteAssistantProjectFile = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.deleteProjectFile,
  resolveContext: ({ principal, input }: { principal: SessionPrincipal; input: DeleteFileInput }) =>
    resolveOwnedProjectContext(principal, input.projectId),
  authorizationOptions: {},
  async execute({ context, input }) {
    if (!(await deleteProjectFile(context.project.id, input.fileId))) projectNotFound()
    return { fileId: input.fileId }
  },
})
