import { isRecordLike } from '@sim/utils/object'
import { executeDelegation } from '@/lib/nexora/delegation/execute'
import { type AgentHandoff, rowsToHandoffs } from '@/lib/nexora/delegation/handoffs'
import { loadDelegationTargets } from '@/lib/nexora/delegation/targets'
import { buildDelegationTool, DELEGATE_TOOL_ID } from '@/lib/nexora/delegation/tool'
import { resolveTransferTarget } from '@/lib/nexora/delegation/transfer'
import type { ExecutionContext, NormalizedBlockOutput } from '@/executor/types'
import type { ProviderToolConfig } from '@/providers/types'

/**
 * Nexora edition: what the Agent block does with its « Peut confier à » list — the tools it offers
 * its model, and the turns it hands over to the agent a conversation was passed to.
 */

interface HandoffInputs {
  handoffs?: unknown
  conversationId?: string
  messages?: unknown
  userPrompt?: unknown
}

/** The handoffs the block holds; a value the form could not show faithfully offers none. */
export function readHandoffInputs(inputs: { handoffs?: unknown }): AgentHandoff[] {
  return rowsToHandoffs(inputs.handoffs) ?? []
}

/** One delegation tool per handoff whose agent is still published. */
export async function buildAgentDelegationTools(params: {
  workspaceId: string
  handoffs: readonly AgentHandoff[]
  conversationId: string | undefined
}): Promise<ProviderToolConfig[]> {
  if (params.handoffs.length === 0) return []
  const targets = await loadDelegationTargets(params.workspaceId, params.handoffs)
  return targets.map(({ target, handoff }) =>
    buildDelegationTool({ target, mode: handoff.mode, conversationId: params.conversationId })
  )
}

/** What the person asked this turn: the last user message, else the user prompt. */
export function lastQuestion(inputs: Pick<HandoffInputs, 'messages' | 'userPrompt'>): string {
  if (Array.isArray(inputs.messages)) {
    for (let index = inputs.messages.length - 1; index >= 0; index--) {
      const message: unknown = inputs.messages[index]
      if (isRecordLike(message) && message.role === 'user' && typeof message.content === 'string') {
        return message.content
      }
    }
  }
  return typeof inputs.userPrompt === 'string' ? inputs.userPrompt : ''
}

/**
 * When the conversation was handed to another agent (mode `transfer`), the output of this turn:
 * the called agent's answer, with the delegation in the block's tool calls so the trace shows it.
 * `null` when the main agent should answer (nothing handed over, no conversation, no question, or
 * the called agent could not answer).
 */
export async function runTransferredTurn(
  inputs: HandoffInputs,
  ctx: ExecutionContext
): Promise<NormalizedBlockOutput | null> {
  const handoffs = readHandoffInputs(inputs)
  const { workspaceId, workflowId } = ctx
  if (handoffs.length === 0 || !inputs.conversationId || !workspaceId || !workflowId) return null
  const handoff = await resolveTransferTarget(
    { workspaceId, workflowId, conversationId: inputs.conversationId },
    handoffs
  )
  if (!handoff) return null
  const question = lastQuestion(inputs).trim()
  if (!question) return null

  const startedAt = new Date()
  const response = await executeDelegation(
    {
      agentId: handoff.agentId,
      mode: 'transfer',
      question,
      conversationId: inputs.conversationId,
    },
    {
      workspaceId,
      workflowId,
      userId: ctx.userId,
      executionId: ctx.executionId,
      callChain: ctx.callChain,
      billingAttribution: ctx.metadata.billingAttribution,
    },
    {
      abortSignal: ctx.abortSignal,
      resolvedSecretTraceRegistry: ctx.resolvedSecretTraceRegistry,
      executorDelegationOrigin: ctx.executorDelegationOrigin,
      principal: ctx.principal,
      unrecordedModelCost: ctx.unrecordedModelCost,
      environmentVariables: ctx.environmentVariables,
      piiBlockOutputRedaction: ctx.piiBlockOutputRedaction,
    }
  )
  if (!response.success) return null

  const endedAt = new Date()
  const answer = typeof response.output.answer === 'string' ? response.output.answer : ''
  return {
    content: answer,
    delegation: {
      agent: response.output.agent,
      agentId: handoff.agentId,
      mode: 'transfer',
    },
    toolCalls: {
      list: [
        {
          name: DELEGATE_TOOL_ID,
          arguments: { question },
          result: response.output,
          startTime: startedAt.toISOString(),
          endTime: endedAt.toISOString(),
          duration: endedAt.getTime() - startedAt.getTime(),
        },
      ],
      count: 1,
    },
    files: [],
    sources: [],
  }
}
