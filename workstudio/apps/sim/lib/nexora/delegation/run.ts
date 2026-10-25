import { getErrorMessage } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { citeSourcesByName } from '@/lib/nexora/delegation/answer'
import { checkDelegation, normalizeChain } from '@/lib/nexora/delegation/guard'
import type { HandoffMode } from '@/lib/nexora/delegation/handoffs'
import type { ChatStreamDelegationFrame } from '@/lib/workflows/streaming/agent-stream-protocol'
import type { ToolResponse } from '@/tools/types'

/**
 * Nexora edition: runs one delegation — an agent hands a request to another published agent of
 * its workspace. The called agent runs as a child of the calling run (its deployed version, its own
 * tools, knowledge, prompt and model; same execution, log, consumption and budgets), after the
 * guards (loop, depth, still published). Everything the world offers (database, child runner,
 * stream, Redis) comes in through {@link DelegationDeps}.
 */

export type DelegationFrame = ChatStreamDelegationFrame

/** A workflow of the workspace, as far as delegation is concerned. */
export interface DelegationAgentInfo {
  workflowId: string
  name: string
  description: string | null
  /** Deployed and in the « Agents » folder: an agent that can be called. */
  published: boolean
}

interface ChildRunParams {
  workflowId: string
  inputMapping: { input: string; conversationId: string }
  /** The chain of agents the child runs under, calling agent last. */
  callChain: string[]
}

export interface DelegationDeps {
  /** The workflows among `workflowIds` that exist in the workspace. */
  loadAgents(workspaceId: string, workflowIds: string[]): Promise<DelegationAgentInfo[]>
  runChild(params: ChildRunParams): Promise<ToolResponse>
  emit(frame: DelegationFrame): void
  /** Hands the calling agent's conversation to `agentId` for its next messages. */
  rememberTransfer(agentId: string, conversationId: string): Promise<void>
  maxDepth: number
}

export interface DelegationInput {
  agentId: string
  mode: HandoffMode
  question: string
  /** The calling agent's conversation, when it has one. */
  conversationId?: string
  workspaceId: string
  callerWorkflowId: string
  callChain?: string[]
  executionId?: string
}

const MAX_ANSWER_CHARS = 20_000

function failure(message: string): ToolResponse {
  return { success: false, output: {}, error: message }
}

function readAnswer(output: Record<string, unknown>): string {
  const result = toRecord(output.result)
  const content = typeof result.content === 'string' ? result.content : ''
  const sources = Array.isArray(result.sources)
    ? result.sources.flatMap((source) =>
        isRecordLike(source) && typeof source.index === 'number' && typeof source.title === 'string'
          ? [{ index: source.index, title: source.title }]
          : []
      )
    : []
  return citeSourcesByName(content, sources).trim().slice(0, MAX_ANSWER_CHARS)
}

export async function runDelegation(
  input: DelegationInput,
  deps: DelegationDeps
): Promise<ToolResponse> {
  const question = input.question.trim()
  if (!question) return failure('La demande à confier à l’agent est vide.')

  const chain = normalizeChain(input.callChain, input.callerWorkflowId)
  const known = new Map(
    (await deps.loadAgents(input.workspaceId, [...new Set([...chain, input.agentId])])).map(
      (agent) => [agent.workflowId, agent]
    )
  )
  const nameOf = (workflowId: string) => known.get(workflowId)?.name ?? 'un autre agent'
  const target = known.get(input.agentId)
  const frameBase = {
    id: generateId(),
    agentId: input.agentId,
    agent: target?.name ?? 'Agent',
    mode: input.mode,
  }
  const stop = (message: string): ToolResponse => {
    deps.emit({
      event: 'delegation',
      data: { ...frameBase, phase: 'end', ok: false, message },
    })
    return failure(message)
  }

  const verdict = checkDelegation({
    chain,
    current: input.callerWorkflowId,
    target: input.agentId,
    maxDepth: deps.maxDepth,
    nameOf,
  })
  if (!verdict.ok) return stop(verdict.message)
  if (!target) {
    return stop('L’agent demandé n’existe plus dans l’espace : la demande n’a pas été transmise.')
  }
  if (!target.published) {
    return stop(`L’agent « ${target.name} » n’est plus publié : la demande n’a pas été transmise.`)
  }

  deps.emit({ event: 'delegation', data: { ...frameBase, phase: 'start' } })
  const conversationId = input.conversationId
    ? `${input.conversationId}:${input.agentId}`
    : `delegation:${input.executionId ?? generateId()}:${input.agentId}`
  let response: ToolResponse
  try {
    response = await deps.runChild({
      workflowId: input.agentId,
      inputMapping: { input: question, conversationId },
      callChain: chain,
    })
  } catch (error) {
    return stop(`L’agent « ${target.name} » n’a pas pu répondre : ${getErrorMessage(error)}`)
  }
  if (!response.success) {
    return stop(
      `L’agent « ${target.name} » n’a pas pu répondre${response.error ? ` : ${response.error}` : '.'}`
    )
  }
  const answer = readAnswer(toRecord(response.output))
  if (!answer) return stop(`L’agent « ${target.name} » n’a donné aucune réponse.`)

  const handedOver = input.mode === 'transfer' && Boolean(input.conversationId)
  if (handedOver && input.conversationId) {
    await deps.rememberTransfer(input.agentId, input.conversationId)
  }
  deps.emit({ event: 'delegation', data: { ...frameBase, phase: 'end', ok: true } })
  return {
    success: true,
    output: {
      agent: target.name,
      mode: handedOver ? 'transfer' : 'reply',
      answer,
      childWorkflowId: input.agentId,
      childWorkflowName: target.name,
    },
  }
}
