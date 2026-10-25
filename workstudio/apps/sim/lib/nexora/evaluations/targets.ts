import {
  type EvalTarget,
  MAX_ANSWER_CHARACTERS,
  type PromptTarget,
} from '@/lib/nexora/evaluations/types'
import { type PromptVariable, renderPrompt } from '@/lib/nexora/prompts/template'
import type { CallTraceContext } from '@/lib/nexora/traces/call'
import type { WandMessage, WandUsage } from '@/lib/nexora/wand'

export interface TargetContext {
  workspaceId: string
  /** The person the campaign runs for: its model calls are traced under them. */
  userId: string | null
  campaignName: string
  signal: AbortSignal
  /** Caps the model's answer (a short classification needs few tokens on a slow local model). */
  maxTokens?: number
}

export interface TargetResult {
  answer: string
  latencyMs: number
  usage: WandUsage
  /** The execution log of an agent's run, `null` for a model. */
  executionId: string | null
}

export interface TargetDeps {
  complete: (input: {
    messages: WandMessage[]
    model: string
    temperature: number
    maxTokens?: number
    signal: AbortSignal
    trace: CallTraceContext
  }) => Promise<{ text: string; usage: WandUsage }>
  loadPromptVersion: (
    workspaceId: string,
    promptId: string,
    version: number
  ) => Promise<{ name: string; content: string; variables: PromptVariable[] } | null>
  runAgent: (
    workflowId: string,
    workspaceId: string,
    text: string,
    signal: AbortSignal
  ) => Promise<{ content: string; usage: WandUsage; executionId: string }>
  now: () => number
}

/** A model id as Nexora API knows it: the Playground's `vllm/` prefix is the instance's own router. */
function wireModel(model: string): string {
  return model.replace(/^vllm\//, '')
}

async function renderedPrompt(
  target: PromptTarget,
  context: TargetContext,
  deps: TargetDeps
): Promise<string> {
  const version = await deps.loadPromptVersion(context.workspaceId, target.promptId, target.version)
  if (!version) {
    throw new Error(
      `Le prompt « ${target.promptName} » (version ${target.version}) n’existe plus dans l’espace.`
    )
  }
  return renderPrompt(version.content, version.variables, target.variables)
}

/**
 * Runs one target on one question: a model (with or without instructions), a pinned version of a
 * prompt on a model, or a published agent. Throws when there is no answer to judge. The model
 * calls are traced (Traces screen) and counted by Nexora API like every other call.
 */
export async function runTarget(
  target: EvalTarget,
  row: { input: string },
  context: TargetContext,
  deps: TargetDeps
): Promise<TargetResult> {
  const startedAt = deps.now()
  const elapsed = () => Math.max(0, deps.now() - startedAt)

  if (target.kind === 'agent') {
    const run = await deps.runAgent(
      target.workflowId,
      context.workspaceId,
      row.input,
      context.signal
    )
    return {
      answer: run.content.slice(0, MAX_ANSWER_CHARACTERS),
      latencyMs: elapsed(),
      usage: run.usage,
      executionId: run.executionId,
    }
  }

  const system =
    target.kind === 'prompt' ? await renderedPrompt(target, context, deps) : target.system
  const messages: WandMessage[] = [
    ...(system?.trim() ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: row.input },
  ]
  const reply = await deps.complete({
    messages,
    model: wireModel(target.model),
    temperature: 0,
    maxTokens: context.maxTokens,
    signal: context.signal,
    trace: {
      source: 'playground',
      workspaceId: context.workspaceId,
      userId: context.userId,
      name: `Évaluation : ${context.campaignName}`,
    },
  })
  return {
    answer: reply.text.slice(0, MAX_ANSWER_CHARACTERS),
    latencyMs: elapsed(),
    usage: reply.usage,
    executionId: null,
  }
}
