import type { WorkflowExecutionPrincipal } from '@sim/auth/principal'
import type { BillingAttributionSnapshot } from '@/lib/billing/core/attribution'
import { resolveMaxDepth } from '@/lib/nexora/delegation/guard'
import type { HandoffMode } from '@/lib/nexora/delegation/handoffs'
import { type DelegationDeps, runDelegation } from '@/lib/nexora/delegation/run'
import { loadDelegationAgents } from '@/lib/nexora/delegation/targets'
import { setTransfer } from '@/lib/nexora/delegation/transfer'
import { getConfirmationSink } from '@/lib/nexora/tool-confirmation/sinks'
import type { PiiBlockOutputRedaction } from '@/executor/execution/types'
import type { ExecutorDelegationOrigin, UnrecordedModelCost } from '@/executor/types'
import type { ResolvedSecretTraceRegistry } from '@/executor/utils/resolved-secret-trace-registry'
import type { ToolResponse } from '@/tools/types'

/**
 * Nexora edition: the delegation tool as the executor runs it. The calling run's own identity,
 * environment and billing carry over to the called agent (it runs as a child of the same
 * execution); the called agent always runs its deployed version, even when the caller is a draft
 * being tested, so a test shows what the published agent would answer.
 */

export interface DelegationScope {
  workspaceId?: string
  workflowId?: string
  userId?: string
  executionId?: string
  callChain?: string[]
  billingAttribution?: BillingAttributionSnapshot
}

export interface DelegationRunOptions {
  abortSignal?: AbortSignal
  resolvedSecretTraceRegistry?: ResolvedSecretTraceRegistry
  executorDelegationOrigin?: ExecutorDelegationOrigin
  principal?: WorkflowExecutionPrincipal
  unrecordedModelCost?: UnrecordedModelCost
  environmentVariables?: Record<string, string>
  piiBlockOutputRedaction?: PiiBlockOutputRedaction
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function modeOf(value: unknown): HandoffMode {
  return value === 'transfer' ? 'transfer' : 'reply'
}

/** `params` come from the tool call: the model's `question`, and the fixed `agentId`, `mode`, `conversationId`. */
export async function executeDelegation(
  params: Record<string, unknown>,
  scope: DelegationScope,
  options: DelegationRunOptions
): Promise<ToolResponse> {
  const { workspaceId, workflowId } = scope
  if (!workspaceId || !workflowId) {
    return {
      success: false,
      output: {},
      error: 'Une délégation ne peut s’exécuter que depuis un agent d’un espace de travail.',
    }
  }
  const agentId = text(params.agentId)
  if (!agentId) {
    return { success: false, output: {}, error: 'Aucun agent n’est désigné pour cette délégation.' }
  }
  const conversationId = text(params.conversationId) || undefined

  const deps: DelegationDeps = {
    loadAgents: loadDelegationAgents,
    emit: (frame) => getConfirmationSink(scope.executionId)?.(frame),
    rememberTransfer: (targetId, conversation) =>
      setTransfer({ workspaceId, workflowId, conversationId: conversation }, targetId),
    maxDepth: resolveMaxDepth(process.env.NEXORA_DELEGATION_MAX_DEPTH),
    runChild: async (child) => {
      // Dynamic import: keeps the executor out of the client-reachable tool registry graph.
      const { runWorkflowTool } = await import('@/executor/handlers/workflow/tool-runner')
      return runWorkflowTool(
        {
          workflowId: child.workflowId,
          inputMapping: child.inputMapping,
          _context: {
            workspaceId,
            workflowId,
            userId: scope.userId,
            executionId: scope.executionId,
            callChain: child.callChain,
            isDeployedContext: true,
            billingAttribution: scope.billingAttribution,
          },
        },
        {
          abortSignal: options.abortSignal,
          resolvedSecretTraceRegistry: options.resolvedSecretTraceRegistry,
          executorDelegationOrigin: options.executorDelegationOrigin,
          principal: options.principal,
          unrecordedModelCost: options.unrecordedModelCost,
          environmentVariables: { ...options.environmentVariables },
          piiBlockOutputRedaction: options.piiBlockOutputRedaction,
        }
      )
    },
  }

  return runDelegation(
    {
      agentId,
      mode: modeOf(params.mode),
      question: text(params.question),
      conversationId,
      workspaceId,
      callerWorkflowId: workflowId,
      callChain: scope.callChain,
      executionId: scope.executionId,
    },
    deps
  )
}
