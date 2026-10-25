import { AuditAction, AuditResourceType } from '@sim/audit'
import {
  type PrincipalActor,
  requirePrincipalSubjectUserId,
  toPrincipalActor,
} from '@sim/auth/principal'
import { db } from '@sim/db'
import {
  chat,
  folder,
  knowledgeBase,
  workflow,
  workflowBlocks,
  workflowDeploymentVersion,
} from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { toRecord } from '@sim/utils/object'
import { generateRandomHex } from '@sim/utils/random'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { buildChatDeploymentUrl } from '@/lib/chat-deployments/urls'
import type { WorkspaceUseCaseAuditEntry } from '@/lib/core/application/authorized-workspace-use-case'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { env } from '@/lib/core/config/env'
import { acquireLock, releaseLock } from '@/lib/core/config/redis'
import { createFolder } from '@/lib/folders/orchestration'
import {
  AGENTS_FOLDER,
  buildAgentWorkflow,
  readsMessageFiles,
  withAssistantTools,
  withMessageFiles,
} from '@/lib/nexora/agents'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { withWebSearchTool } from '@/lib/nexora/assistant/web-search'
import { importWorkflowIntoWorkspaceTransition } from '@/lib/workflows/operations/import-workflow'
import { performChatDeploy } from '@/lib/workflows/orchestration'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

const logger = createLogger('NexoraGeneralAssistant')

/** The provided agent's name, which also identifies it in the workspace's `Agents` folder. */
export const GENERAL_ASSISTANT_NAME = 'Assistant général'
export const GENERAL_ASSISTANT_WELCOME =
  "Bonjour, je suis l'assistant de votre entreprise. Que puis-je faire pour vous ?"
const GENERAL_ASSISTANT_DESCRIPTION =
  "Assistant fourni par Nexora : répond aux questions des salariés et cherche dans toutes les bases de connaissances de l'espace."
const GENERAL_ASSISTANT_INSTRUCTIONS = [
  "Vous êtes l'assistant interne d'une PME française. Vous aidez les salariés de l'entreprise dans leur travail quotidien.",
  'Répondez toujours en français, en vouvoyant votre interlocuteur, de façon brève, claire et professionnelle.',
  "N'inventez jamais rien : si vous ne savez pas, ou si vous n'êtes pas sûr de votre réponse, dites-le clairement.",
  "Quand la question concerne l'entreprise, cherchez d'abord dans les bases de connaissances, puis citez les documents sur lesquels votre réponse s'appuie.",
  'Si la demande est ambiguë, posez une question pour la préciser avant de répondre.',
].join('\n')
/** What the Assistant's chat shows of the Agent block: its answer, the files it produced, its sources. */
const ASSISTANT_OUTPUT_PATHS = ['content', 'files', 'sources'] as const

function assistantOutputConfigs(agentBlockId: string) {
  return ASSISTANT_OUTPUT_PATHS.map((path) => ({ blockId: agentBlockId, path }))
}
/** The model id as blocks store it: the Nexora API's default model. */
const GENERAL_ASSISTANT_MODEL = 'vllm/nexora-default'

/** Long enough to cover one creation (import, deployment, chat); released as soon as it ends. */
const CREATION_LOCK_SECONDS = 120

export interface GeneralAssistant {
  workflowId: string
  chatId: string
  chatIdentifier: string
  /** This call created the assistant's workflow. */
  createdWorkflow: boolean
  /** This call deployed the workflow and published its chat. */
  publishedChat: boolean
  /** Who may open the chat. */
  authType: string
}

interface GeneralAssistantState {
  folderId: string | null
  workflow: { id: string; isDeployed: boolean } | null
  chat: {
    id: string
    identifier: string
    isActive: boolean
    title: string
    authType: string
  } | null
}

async function findAgentsFolderId(workspaceId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: folder.id })
    .from(folder)
    .where(
      and(
        eq(folder.workspaceId, workspaceId),
        eq(folder.resourceType, 'workflow'),
        eq(folder.name, AGENTS_FOLDER),
        isNull(folder.parentId),
        isNull(folder.deletedAt)
      )
    )
    .limit(1)
  return row?.id ?? null
}

/** Where the assistant stands: its folder, its workflow and its chat, each possibly missing. */
async function readGeneralAssistantState(workspaceId: string): Promise<GeneralAssistantState> {
  const folderId = await findAgentsFolderId(workspaceId)
  if (!folderId) return { folderId, workflow: null, chat: null }

  const [existing] = await db
    .select({ id: workflow.id, isDeployed: workflow.isDeployed })
    .from(workflow)
    .where(
      and(
        eq(workflow.workspaceId, workspaceId),
        eq(workflow.folderId, folderId),
        eq(workflow.name, GENERAL_ASSISTANT_NAME),
        isNull(workflow.archivedAt)
      )
    )
    .limit(1)
  if (!existing) return { folderId, workflow: null, chat: null }

  const [liveChat] = await db
    .select({
      id: chat.id,
      identifier: chat.identifier,
      isActive: chat.isActive,
      title: chat.title,
      authType: chat.authType,
    })
    .from(chat)
    .where(and(eq(chat.workflowId, existing.id), isNull(chat.archivedAt)))
    .limit(1)
  return { folderId, workflow: existing, chat: liveChat ?? null }
}

function publishedAssistant(state: GeneralAssistantState): GeneralAssistant | null {
  if (!state.workflow?.isDeployed || !state.chat?.isActive) return null
  return {
    workflowId: state.workflow.id,
    chatId: state.chat.id,
    chatIdentifier: state.chat.identifier,
    createdWorkflow: false,
    publishedChat: false,
    authType: state.chat.authType,
  }
}

async function listKnowledgeBaseIds(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.workspaceId, workspaceId), isNull(knowledgeBase.deletedAt)))
    .orderBy(asc(knowledgeBase.createdAt))
  return rows.map((row) => row.id)
}

interface StoredAgentBlock {
  id: string
  subBlocks: unknown
  data: unknown
}

/** The Agent block of an existing assistant, when it has exactly one (else the chat keeps its outputs). */
async function findAgentBlock(workflowId: string): Promise<StoredAgentBlock | null> {
  const rows = await db
    .select({
      id: workflowBlocks.id,
      subBlocks: workflowBlocks.subBlocks,
      data: workflowBlocks.data,
    })
    .from(workflowBlocks)
    .where(and(eq(workflowBlocks.workflowId, workflowId), eq(workflowBlocks.type, 'agent')))
  return rows.length === 1 ? (rows[0] ?? null) : null
}

/**
 * An assistant whose live version predates agents reading the files attached to a message (the
 * single Agent block of its active deployment has no `files` field) or the Python interpreter (no
 * such tool, and no revision mark saying an administrator removed it). Read from the deployed
 * version, not the draft, so an upgrade saved to the draft but never deployed is retried.
 */
async function liveVersionNeedsUpgrade(workflowId: string): Promise<boolean> {
  const [active] = await db
    .select({ state: workflowDeploymentVersion.state })
    .from(workflowDeploymentVersion)
    .where(
      and(
        eq(workflowDeploymentVersion.workflowId, workflowId),
        eq(workflowDeploymentVersion.isActive, true)
      )
    )
    .limit(1)
  if (!active) return false
  const agents = Object.values(toRecord(toRecord(active.state).blocks)).filter(
    (block) => toRecord(block).type === 'agent'
  )
  if (agents.length !== 1) return false
  const agent = toRecord(agents[0])
  const block = { subBlocks: agent.subBlocks, data: agent.data }
  return (
    toRecord(agent.subBlocks).files === undefined ||
    withAssistantTools(block) !== null ||
    (Boolean(env.SEARXNG_URL) && withWebSearchTool(block) !== null)
  )
}

/**
 * Makes a published assistant read attached files: its draft Agent block gets the `files`
 * reference (unless an administrator set that field otherwise) and the workflow is redeployed.
 * The chat keeps every setting it has (access, title, description, welcome message, outputs):
 * the redeployment passes only its address and title, which it requires.
 */
async function upgradePublishedAssistant(params: {
  workspaceId: string
  userId: string
  actor?: PrincipalActor
  published: GeneralAssistant
  chat: { identifier: string; title: string }
}): Promise<GeneralAssistant> {
  const { published } = params
  const agentBlock = await findAgentBlock(published.workflowId)
  if (!agentBlock) return published
  const filesUpgrade = withMessageFiles(agentBlock)
  const toolsUpgrade = withAssistantTools(filesUpgrade ?? agentBlock)
  // With the web search installed, the Assistant is offered it once (see `withWebSearchTool`).
  const searchUpgrade = env.SEARXNG_URL
    ? withWebSearchTool(toolsUpgrade ?? filesUpgrade ?? agentBlock)
    : null
  const upgrade = searchUpgrade ?? toolsUpgrade ?? filesUpgrade
  if (upgrade) {
    await db
      .update(workflowBlocks)
      .set({ subBlocks: upgrade.subBlocks, data: upgrade.data, updatedAt: new Date() })
      .where(eq(workflowBlocks.id, agentBlock.id))
  } else if (!readsMessageFiles(agentBlock.subBlocks)) {
    return published
  }

  const deployed = await performChatDeploy({
    workflowId: published.workflowId,
    userId: params.userId,
    actorId: params.userId,
    actor: params.actor,
    identifier: params.chat.identifier,
    title: params.chat.title,
    workspaceId: params.workspaceId,
    requestId: generateId(),
    projectLegacyAudit: false,
    // The interpreter's files and the sources come to the chat as outputs of the Agent block.
    ...(toolsUpgrade || searchUpgrade
      ? { outputConfigs: assistantOutputConfigs(agentBlock.id) }
      : {}),
  })
  if (!deployed.success) {
    throw new Error(deployed.error ?? 'Failed to republish the general assistant')
  }
  logger.info('General assistant upgraded to read attached files', {
    workspaceId: params.workspaceId,
    workflowId: published.workflowId,
  })
  return { ...published, publishedChat: true }
}

async function ensureAgentsFolder(
  workspaceId: string,
  userId: string,
  folderId: string | null
): Promise<string> {
  if (folderId) return folderId
  const created = await createFolder({
    resourceType: 'workflow',
    workspaceId,
    userId,
    name: AGENTS_FOLDER,
  })
  if (created.success && created.folder) return created.folder.id
  // Created meanwhile by someone else (the folder name is unique among its siblings).
  const existing = created.errorCode === 'conflict' ? await findAgentsFolderId(workspaceId) : null
  if (existing) return existing
  throw new Error(created.error ?? 'Failed to create the Agents folder')
}

async function createAssistantWorkflow(params: {
  workspaceId: string
  userId: string
  folderId: string
  requestId: string
}): Promise<{ workflowId: string; agentBlockId: string | null }> {
  const knowledgeBaseIds = await listKnowledgeBaseIds(params.workspaceId)
  const state = buildAgentWorkflow({
    name: GENERAL_ASSISTANT_NAME,
    description: GENERAL_ASSISTANT_DESCRIPTION,
    instructions: GENERAL_ASSISTANT_INSTRUCTIONS,
    model: GENERAL_ASSISTANT_MODEL,
    tools: [],
    knowledgeBaseIds,
    // Withdrawn at run time while code execution is off (see dropUnavailableBuiltinTools).
    codeInterpreter: true,
    webSearch: false,
    memory: true,
    reasoningEffort: 'auto',
    instructionsPrompt: null,
    handoffs: [],
    skills: [],
    welcomeMessage: GENERAL_ASSISTANT_WELCOME,
  })
  const imported = await importWorkflowIntoWorkspaceTransition({
    workspaceId: params.workspaceId,
    folderId: params.folderId,
    name: GENERAL_ASSISTANT_NAME,
    description: GENERAL_ASSISTANT_DESCRIPTION,
    workflow: JSON.stringify(state),
    userId: params.userId,
    capabilityUserId: params.userId,
    requestId: params.requestId,
  })
  if (!imported.success) throw new Error(imported.error)
  // The import regenerates block ids: the chat must point at the stored Agent block.
  const agentBlock = imported.workflow.blocks.find((block) => block.type === 'agent')
  return { workflowId: imported.workflow.id, agentBlockId: agentBlock?.id ?? null }
}

/**
 * Provides the workspace's « Assistant général », idempotently: when its workflow (named
 * {@link GENERAL_ASSISTANT_NAME} in the top-level `Agents` folder) is deployed with an active
 * chat, nothing happens (but for a live version that predates attached files, upgraded by
 * {@link upgradePublishedAssistant}); otherwise the folder and the workflow are created when
 * missing (all the workspace's knowledge bases, conversation memory, the Nexora default model),
 * then it is deployed and its chat published for the workspace's members only.
 *
 * Resolves `null` while another request is creating it. A failure throws, and the next call
 * resumes from what was already created (an unpublished assistant is published, not duplicated).
 */
async function ensureGeneralAssistant(params: {
  workspaceId: string
  userId: string
  actor?: PrincipalActor
}): Promise<GeneralAssistant | null> {
  const { workspaceId, userId } = params
  const ready = publishedAssistant(await readGeneralAssistantState(workspaceId))
  if (ready && !(await liveVersionNeedsUpgrade(ready.workflowId))) return ready

  const lockKey = `nexora:general-assistant:${workspaceId}`
  const lockValue = generateId()
  if (!(await acquireLock(lockKey, lockValue, CREATION_LOCK_SECONDS, { reclaimOnFailure: true }))) {
    logger.info('General assistant is being created by another request', { workspaceId })
    return null
  }

  try {
    const state = await readGeneralAssistantState(workspaceId)
    const published = publishedAssistant(state)
    if (published && state.chat) {
      if (!(await liveVersionNeedsUpgrade(published.workflowId))) return published
      return await upgradePublishedAssistant({
        workspaceId,
        userId,
        actor: params.actor,
        published,
        chat: state.chat,
      })
    }

    const agentBlock = state.workflow ? await findAgentBlock(state.workflow.id) : null
    const filesUpgrade = agentBlock ? withMessageFiles(agentBlock) : null
    const toolsUpgrade = agentBlock ? withAssistantTools(filesUpgrade ?? agentBlock) : null
    const searchUpgrade =
      agentBlock && env.SEARXNG_URL
        ? withWebSearchTool(toolsUpgrade ?? filesUpgrade ?? agentBlock)
        : null
    const upgrade = searchUpgrade ?? toolsUpgrade ?? filesUpgrade
    if (agentBlock && upgrade) {
      // The redeploy below publishes the upgraded draft.
      await db
        .update(workflowBlocks)
        .set({ subBlocks: upgrade.subBlocks, data: upgrade.data, updatedAt: new Date() })
        .where(eq(workflowBlocks.id, agentBlock.id))
    }

    const requestId = generateId()
    const folderId = await ensureAgentsFolder(workspaceId, userId, state.folderId)
    const { workflowId, agentBlockId } = state.workflow
      ? { workflowId: state.workflow.id, agentBlockId: agentBlock?.id ?? null }
      : await createAssistantWorkflow({ workspaceId, userId, folderId, requestId })

    const identifier = state.chat?.identifier ?? `assistant-${generateRandomHex(8)}`
    const deployed = await performChatDeploy({
      workflowId,
      userId,
      actorId: userId,
      actor: params.actor,
      identifier,
      title: GENERAL_ASSISTANT_NAME,
      description: GENERAL_ASSISTANT_DESCRIPTION,
      customizations: { welcomeMessage: GENERAL_ASSISTANT_WELCOME },
      authType: 'workspace',
      outputConfigs: agentBlockId ? assistantOutputConfigs(agentBlockId) : undefined,
      // Members see the reasoning through their session (chat route); the chat itself never shares it.
      includeThinking: false,
      workspaceId,
      requestId,
      projectLegacyAudit: false,
    })
    if (!deployed.success || !deployed.chatId) {
      throw new Error(deployed.error ?? 'Failed to publish the general assistant')
    }
    logger.info('General assistant provided', { workspaceId, workflowId })
    return {
      workflowId,
      chatId: deployed.chatId,
      chatIdentifier: identifier,
      createdWorkflow: !state.workflow,
      publishedChat: true,
      authType: 'workspace',
    }
  } finally {
    await releaseLock(lockKey, lockValue).catch((error: unknown) =>
      logger.warn('General assistant lock release failed', {
        workspaceId,
        error: getErrorMessage(error),
      })
    )
  }
}

/**
 * Provides the « Assistant général » for the calling member (see {@link ensureGeneralAssistant}):
 * the creation is attributed to that member and audited under their principal.
 */
export const ensureGeneralAssistantAgent = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.ensureGeneralAgent,
  resolveContext: ({ input }: { input: { workspaceId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: ({ principal, context }) =>
    ensureGeneralAssistant({
      workspaceId: context.workspaceId,
      userId: requirePrincipalSubjectUserId(principal),
      actor: toPrincipalActor(principal),
    }),
  projectAudit: ({ result }) => {
    const entries: WorkspaceUseCaseAuditEntry[] = []
    if (result?.createdWorkflow) {
      entries.push({
        action: AuditAction.WORKFLOW_CREATED,
        resourceType: AuditResourceType.WORKFLOW,
        resourceId: result.workflowId,
        resourceName: GENERAL_ASSISTANT_NAME,
        description: `Created workflow "${GENERAL_ASSISTANT_NAME}"`,
      })
    }
    if (result?.publishedChat) {
      entries.push({
        action: AuditAction.CHAT_DEPLOYED,
        resourceType: AuditResourceType.CHAT,
        resourceId: result.chatId,
        resourceName: GENERAL_ASSISTANT_NAME,
        description: `Deployed chat "${GENERAL_ASSISTANT_NAME}"`,
        metadata: {
          workflowId: result.workflowId,
          identifier: result.chatIdentifier,
          authType: result.authType,
          chatUrl: buildChatDeploymentUrl(result.chatIdentifier),
        },
      })
    }
    return entries
  },
})
