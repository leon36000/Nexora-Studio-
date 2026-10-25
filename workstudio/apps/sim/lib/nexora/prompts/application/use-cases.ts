import { AuditAction, AuditResourceType } from '@sim/audit'
import { resolvePrincipalSubjectUserId } from '@sim/auth/principal'
import type { CursorKey, ListSortOrder } from '@/lib/api/list-query'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { nexoraPromptOperations } from '@/lib/nexora/prompts/application/operations'
import {
  deletePrompt,
  findPromptRow,
  getPromptDetail,
  getPromptVersion,
  insertPromptVersion,
  insertPromptWithFirstVersion,
  listPrompts,
  movePromptLabel,
  type PromptSortBy,
} from '@/lib/nexora/prompts/repository'
import { invalidatePromptResolution } from '@/lib/nexora/prompts/resolve'
import {
  type PromptLabel,
  type PromptSelector,
  type PromptVariable,
  reconcileVariables,
} from '@/lib/nexora/prompts/template'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

const authorizationOptions = {}

interface WorkspaceInput {
  workspaceId: string
}

/** A prompt named by its id or its name, within the workspace. */
interface PromptInput extends WorkspaceInput {
  promptRef: string
}

interface VersionContent {
  content: string
  variables: PromptVariable[]
  note: string
}

function resolveWorkspace({ input }: { input: WorkspaceInput }) {
  return resolveActiveWorkspaceApplicationContext(input.workspaceId)
}

async function requirePromptId(workspaceId: string, promptRef: string): Promise<string> {
  const row = await findPromptRow(workspaceId, promptRef)
  if (!row) throw new OrchestrationError('not_found', 'Prompt introuvable')
  return row.id
}

export const listPromptsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.list,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & {
      search?: string
      sortBy?: PromptSortBy
      sortOrder?: ListSortOrder
      limit?: number
      cursorKeys?: CursorKey[]
    }
  }) => resolveWorkspace({ input }),
  authorizationOptions,
  execute: ({ context, input }) => listPrompts({ ...input, workspaceId: context.workspaceId }),
})

/** A prompt with every version: the Prompts page. */
export const getPromptDetailUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.read,
  resolveContext: ({ input }: { input: PromptInput }) => resolveWorkspace({ input }),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const prompt = await getPromptDetail(context.workspaceId, input.promptRef)
    if (!prompt) throw new OrchestrationError('not_found', 'Prompt introuvable')
    return { prompt }
  },
})

/** A prompt and one of its versions: by label (production by default), by number, or the latest. */
export const getPromptUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.read,
  resolveContext: ({
    input,
  }: {
    input: PromptInput & { pick: { selector: PromptSelector } | { version: number } }
  }) => resolveWorkspace({ input }),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const prompt = await getPromptDetail(context.workspaceId, input.promptRef)
    if (!prompt) throw new OrchestrationError('not_found', 'Prompt introuvable')
    const version = await getPromptVersion(prompt.id, input.pick)
    if (!version) {
      throw new OrchestrationError(
        'not_found',
        'version' in input.pick
          ? `Le prompt n'a pas de version ${input.pick.version}.`
          : `Le prompt n'a pas de version étiquetée « ${input.pick.selector} ».`
      )
    }
    const { versions: _versions, ...record } = prompt
    return { prompt: record, version }
  },
})

export const createPromptUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.create,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & VersionContent & { name: string; description: string }
  }) => resolveWorkspace({ input }),
  authorizationOptions,
  execute: ({ context, input, principal }) =>
    insertPromptWithFirstVersion({
      workspaceId: context.workspaceId,
      name: input.name,
      description: input.description,
      content: input.content,
      variables: reconcileVariables(input.content, input.variables),
      note: input.note,
      createdBy: resolvePrincipalSubjectUserId(principal) ?? null,
    }),
  projectAudit: ({ result }) => ({
    action: AuditAction.PROMPT_CREATED,
    resourceType: AuditResourceType.PROMPT,
    resourceId: result.prompt.id,
    resourceName: result.prompt.name,
    description: `Created prompt "${result.prompt.name}"`,
    metadata: { version: result.version.version },
  }),
})

export const createPromptVersionUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.createVersion,
  resolveContext: ({ input }: { input: PromptInput & VersionContent }) =>
    resolveWorkspace({ input }),
  authorizationOptions,
  execute: async ({ context, input, principal }) =>
    insertPromptVersion({
      workspaceId: context.workspaceId,
      promptId: await requirePromptId(context.workspaceId, input.promptRef),
      content: input.content,
      variables: reconcileVariables(input.content, input.variables),
      note: input.note,
      createdBy: resolvePrincipalSubjectUserId(principal) ?? null,
    }),
  projectAudit: ({ result }) => ({
    action: AuditAction.PROMPT_VERSION_CREATED,
    resourceType: AuditResourceType.PROMPT,
    resourceId: result.prompt.id,
    resourceName: result.prompt.name,
    description: `Created version ${result.version.version} of prompt "${result.prompt.name}"`,
    metadata: { version: result.version.version, note: result.version.note },
  }),
  afterSuccess: ({ result }) => invalidatePromptResolution(result.prompt.id),
})

/** Points `production` or `test` at a version: agents using that label read it from their next run. */
export const movePromptLabelUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.moveLabel,
  resolveContext: ({ input }: { input: PromptInput & { label: PromptLabel; version: number } }) =>
    resolveWorkspace({ input }),
  authorizationOptions,
  execute: async ({ context, input, principal }) =>
    movePromptLabel({
      workspaceId: context.workspaceId,
      promptId: await requirePromptId(context.workspaceId, input.promptRef),
      label: input.label,
      version: input.version,
      updatedBy: resolvePrincipalSubjectUserId(principal) ?? null,
    }),
  projectAudit: ({ result, input }) =>
    result.changed
      ? {
          action: AuditAction.PROMPT_LABEL_MOVED,
          resourceType: AuditResourceType.PROMPT,
          resourceId: result.prompt.id,
          resourceName: result.prompt.name,
          description: `Moved label "${input.label}" of prompt "${result.prompt.name}" to version ${result.version}`,
          metadata: {
            label: input.label,
            fromVersion: result.previousVersion,
            toVersion: result.version,
          },
        }
      : [],
  afterSuccess: ({ result }) => invalidatePromptResolution(result.prompt.id),
})

export const deletePromptUseCase = defineAuthorizedWorkspaceUseCase({
  operation: nexoraPromptOperations.delete,
  resolveContext: ({ input }: { input: PromptInput }) => resolveWorkspace({ input }),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const prompt = await deletePrompt(
      context.workspaceId,
      await requirePromptId(context.workspaceId, input.promptRef)
    )
    if (!prompt) throw new OrchestrationError('not_found', 'Prompt introuvable')
    return { prompt }
  },
  projectAudit: ({ result }) => ({
    action: AuditAction.PROMPT_DELETED,
    resourceType: AuditResourceType.PROMPT,
    resourceId: result.prompt.id,
    resourceName: result.prompt.name,
    description: `Deleted prompt "${result.prompt.name}"`,
    metadata: { latestVersion: result.prompt.latestVersion },
  }),
  afterSuccess: ({ result }) => invalidatePromptResolution(result.prompt.id),
})
