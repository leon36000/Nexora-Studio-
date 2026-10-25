import { truncate } from '@sim/utils/string'
import {
  type ActionOperationLookup,
  needsConfirmation,
  type ToolConfirmationSpec,
} from '@/lib/nexora/tool-confirmation/policy'
import { getConfirmationSink } from '@/lib/nexora/tool-confirmation/sinks'
import {
  CONFIRMATION_TTL_SECONDS,
  createConfirmationRequest,
  waitForDecision,
} from '@/lib/nexora/tool-confirmation/store'

const SUMMARY_CHARS = 600

export type GateOutcome =
  | { kind: 'proceed' }
  | { kind: 'denied'; reason: 'user' | 'timeout' }
  /** Nobody follows this run: the action waits for the run's own approval pause. */
  | { kind: 'deferred'; title: string; summary: string }

interface GateInput {
  spec: ToolConfirmationSpec
  args: Record<string, unknown>
  executionId: string | undefined
  lookupOperation: ActionOperationLookup
  signal?: AbortSignal
  timeoutMs?: number
}

/** What the person is shown the action would do: the input of a Nexora Connect action, else the arguments. */
export function summarizeCall(args: Record<string, unknown>): string {
  const shown = typeof args.actionId === 'string' && 'input' in args ? args.input : args
  return truncate(JSON.stringify(shown) ?? '', SUMMARY_CHARS)
}

/**
 * Decides whether a tool call may run now: unflagged calls proceed; flagged ones ask the person
 * who follows the run and wait for « Autoriser » or « Refuser » (no answer, or a cancelled run, is
 * a refusal); a run nobody follows defers the call.
 */
export async function gateToolCall(input: GateInput): Promise<GateOutcome> {
  const decision = await needsConfirmation(input.spec, input.args, input.lookupOperation)
  if (!decision.needed) return { kind: 'proceed' }
  const title = decision.title ?? input.spec.title
  const summary = summarizeCall(input.args)
  const sink = getConfirmationSink(input.executionId)
  if (!sink || !input.executionId) return { kind: 'deferred', title, summary }

  const request = await createConfirmationRequest({
    executionId: input.executionId,
    title,
    summary,
  })
  sink({
    event: 'confirmation',
    data: {
      id: request.id,
      token: request.token,
      title,
      toolName: input.spec.toolName,
      summary,
      expiresAt: request.expiresAt,
    },
  })
  const answer = await waitForDecision(request.id, {
    timeoutMs: input.timeoutMs ?? CONFIRMATION_TTL_SECONDS * 1000,
    signal: input.signal,
  })
  sink({
    event: 'confirmation_end',
    data: { id: request.id, decision: answer ?? 'expired' },
  })
  if (answer === 'allow') return { kind: 'proceed' }
  return { kind: 'denied', reason: answer === 'deny' ? 'user' : 'timeout' }
}
