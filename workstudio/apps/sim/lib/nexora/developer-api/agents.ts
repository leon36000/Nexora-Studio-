import { db } from '@sim/db'
import { folder, workflow } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { isRecordLike, toRecordOrNull } from '@sim/utils/object'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { releaseExecutionSlot } from '@/lib/billing/calculations/usage-reservation'
import { generateRequestId } from '@/lib/core/utils/request'
import { SSE_HEADERS } from '@/lib/core/utils/sse'
import { preprocessExecution } from '@/lib/execution/preprocessing'
import { LoggingSession } from '@/lib/logs/execution/logging-session'
import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import {
  type AgentRunUsage,
  buildAgentInput,
  collectAgentAnswer,
  toOpenAiChunks,
} from '@/lib/nexora/developer-api/agent-format'
import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { type GatewayCall, recordUsage } from '@/lib/nexora/developer-api/gateway'
import { AGENT_MODEL_PREFIX, agentReference } from '@/lib/nexora/developer-api/policy'
import { loadDeployedWorkflowState } from '@/lib/workflows/persistence/utils'
import { formatOutputSelector } from '@/lib/workflows/streaming/output-selector'
import type { ExecutionResult } from '@/executor/types'

const logger = createLogger('NexoraDeveloperApiAgents')

/** A published agent the developer API can call: a deployed workflow of the « Agents » folder. */
export interface ApiAgent {
  workflowId: string
  name: string
  description: string | null
  ownerId: string
  variables: Record<string, unknown> | null
  createdAt: Date
}

/** The workspace's published agents, in the order the agent list shows them. */
export async function listApiAgents(workspaceId: string): Promise<ApiAgent[]> {
  const rows = await db
    .select({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      ownerId: workflow.userId,
      variables: workflow.variables,
      createdAt: workflow.createdAt,
    })
    .from(workflow)
    .innerJoin(folder, eq(workflow.folderId, folder.id))
    .where(
      and(
        eq(workflow.workspaceId, workspaceId),
        eq(workflow.isDeployed, true),
        isNull(workflow.archivedAt),
        eq(folder.workspaceId, workspaceId),
        eq(folder.resourceType, 'workflow'),
        eq(folder.name, AGENTS_FOLDER),
        isNull(folder.parentId),
        isNull(folder.deletedAt)
      )
    )
    .orderBy(asc(workflow.sortOrder), asc(workflow.name))
  return rows.map((row) => ({
    ...row,
    variables: toRecordOrNull(row.variables),
  }))
}

/**
 * The model id an agent answers to: `agent:<name>`, or `agent:<workflow id>` when another
 * published agent of the workspace has the same name.
 */
export function agentModelIds(agents: readonly ApiAgent[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const agent of agents) {
    const key = agent.name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Map(
    agents.map((agent) => [
      agent.workflowId,
      `${AGENT_MODEL_PREFIX}${(counts.get(agent.name.trim().toLowerCase()) ?? 0) > 1 ? agent.workflowId : agent.name.trim()}`,
    ])
  )
}

/** The agent `agent:<name or id>` designates among the key's workspace's published agents. */
async function resolveApiAgent(workspaceId: string, model: string): Promise<ApiAgent> {
  const reference = agentReference(model)
  if (!reference) throw gatewayErrors.agentNotFound(reference)
  const agents = await listApiAgents(workspaceId)
  const byId = agents.find((agent) => agent.workflowId === reference)
  if (byId) return byId
  const named = agents.filter(
    (agent) => agent.name.trim().toLowerCase() === reference.toLowerCase()
  )
  if (named.length === 1) return named[0]
  if (named.length > 1) throw gatewayErrors.agentAmbiguous(reference)
  throw gatewayErrors.agentNotFound(reference)
}

function tokensOf(output: unknown): AgentRunUsage {
  if (!isRecordLike(output) || !isRecordLike(output.tokens)) {
    return { promptTokens: 0, completionTokens: 0 }
  }
  const { tokens } = output
  const read = (...values: unknown[]) => {
    const value = values.find((entry) => typeof entry === 'number' && Number.isFinite(entry))
    return typeof value === 'number' ? Math.max(0, Math.round(value)) : 0
  }
  return {
    promptTokens: read(tokens.input, tokens.prompt),
    completionTokens: read(tokens.output, tokens.completion),
  }
}

/** Tokens of every model call of a run, read from its block logs. */
function runUsage(result: ExecutionResult | null): AgentRunUsage {
  const usage = { promptTokens: 0, completionTokens: 0 }
  for (const log of result?.logs ?? []) {
    const used = tokensOf(log.output)
    usage.promptTokens += used.promptTokens
    usage.completionTokens += used.completionTokens
  }
  return usage
}

/** The block whose `content` answers: the agent block of the deployed version. */
async function answerBlockId(agent: ApiAgent, workspaceId: string): Promise<string> {
  const deployed = await loadDeployedWorkflowState(agent.workflowId, workspaceId).catch(
    (error: unknown) => {
      logger.warn('Published agent has no deployed version', {
        workflowId: agent.workflowId,
        error: getErrorMessage(error),
      })
      return null
    }
  )
  const blocks = deployed ? Object.values(deployed.blocks) : []
  const agentBlocks = blocks.filter((block) => block.type === 'agent' && block.enabled !== false)
  const answer = agentBlocks.find((block) => block.name === 'Agent') ?? agentBlocks.at(-1)
  if (!answer) throw gatewayErrors.agentNotFound(agent.name)
  return answer.id
}

/**
 * Answers an OpenAI chat completion with a published agent: its deployed version runs as an API
 * run of the workspace (execution log, usage ledger, budgets), its answer streamed as
 * `chat.completion.chunk` events or returned whole, and its tokens recorded on the key.
 */
export async function runAgentCompletion(
  call: GatewayCall,
  body: { model: string; messages: unknown[]; stream?: boolean },
  request: Request
): Promise<Response> {
  const workspaceId = call.key.workspaceId
  if (!workspaceId) throw gatewayErrors.agentNeedsWorkspaceKey()
  const input = buildAgentInput(body.messages)
  const agent = await resolveApiAgent(workspaceId, body.model)
  const modelId =
    agentModelIds(await listApiAgents(workspaceId)).get(agent.workflowId) ?? body.model
  const blockId = await answerBlockId(agent, workspaceId)

  const requestId = generateRequestId()
  const executionId = generateId()
  const loggingSession = new LoggingSession(agent.workflowId, executionId, 'api', requestId)
  const preprocess = await preprocessExecution({
    workflowId: agent.workflowId,
    userId: agent.ownerId,
    userIdIsStoredReference: true,
    triggerType: 'api',
    executionId,
    requestId,
    checkRateLimit: true,
    checkDeployment: true,
    loggingSession,
  })
  if (!preprocess.success) {
    const { message, statusCode } = preprocess.error
    throw new GatewayError(
      statusCode,
      statusCode === 402 ? 'monthly_budget_reached' : 'agent_unavailable',
      message,
      statusCode === 402 ? 'insufficient_quota' : undefined
    )
  }

  const { actorUserId, billingAttribution, workflowRecord } = preprocess
  const selectedOutputs = [formatOutputSelector(blockId, 'content')]
  let result: ExecutionResult | null = null
  let usageRecorded = false
  const settleUsage = async (): Promise<AgentRunUsage> => {
    const usage = runUsage(result)
    if (!usageRecorded) {
      usageRecorded = true
      await recordUsage(call.key, modelId, usage.promptTokens, usage.completionTokens)
    }
    return usage
  }

  let simStream: ReadableStream<Uint8Array>
  try {
    const [{ createStreamingResponse }, { executeWorkflow }] = await Promise.all([
      import('@/lib/workflows/streaming/streaming'),
      import('@/lib/workflows/executor/execute-workflow'),
    ])
    simStream = await createStreamingResponse({
      requestId,
      streamConfig: { selectedOutputs, isSecureMode: true, workflowTriggerType: 'api' },
      executionId,
      workspaceId,
      workflowId: agent.workflowId,
      userId: actorUserId,
      requestSignal: request.signal,
      executeFn: async ({ onStream, onBlockComplete, abortSignal }) => {
        result = await executeWorkflow(
          {
            id: agent.workflowId,
            userId: workflowRecord.userId,
            workspaceId,
            isDeployed: workflowRecord.isDeployed ?? true,
            variables: (workflowRecord.variables as Record<string, unknown>) ?? undefined,
          },
          requestId,
          { input, conversationId: `api-${executionId}` },
          actorUserId,
          {
            enabled: true,
            principal: {
              kind: 'system',
              serviceId: 'public_api',
              workspaceId,
              workflowId: agent.workflowId,
            },
            selectedOutputs,
            isSecureMode: true,
            workflowTriggerType: 'api',
            onStream,
            onBlockComplete: (completedBlockId, data) =>
              onBlockComplete(completedBlockId, data.output, data.outputBlockId),
            skipLoggingComplete: true,
            abortSignal,
            executionMode: 'stream',
            billingAttribution,
          },
          executionId
        )
        return result
      },
    })
  } catch (error) {
    await releaseExecutionSlot(executionId)
    logger.error('Published agent could not start', {
      workflowId: agent.workflowId,
      error: getErrorMessage(error),
    })
    throw new GatewayError(500, 'agent_failed', 'L’agent n’a pas pu démarrer. Réessayez.')
  }

  const meta = {
    id: `chatcmpl-${executionId}`,
    model: modelId,
    created: Math.floor(Date.now() / 1000),
  }
  if (body.stream) {
    return new Response(toOpenAiChunks(simStream, meta, settleUsage), {
      status: 200,
      headers: { ...SSE_HEADERS, ...call.headers },
    })
  }

  const answer = await collectAgentAnswer(simStream)
  const usage = await settleUsage()
  if (answer.error !== null) {
    throw new GatewayError(500, 'agent_failed', answer.error, 'api_error', call.headers)
  }
  return Response.json(
    {
      id: meta.id,
      object: 'chat.completion',
      created: meta.created,
      model: meta.model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: answer.content },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.promptTokens + usage.completionTokens,
      },
    },
    { headers: call.headers }
  )
}
