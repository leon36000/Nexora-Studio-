import type { ProtectionNote } from '@/lib/nexora/data-protection/notes'
import { draftFromCall } from '@/lib/nexora/traces/from-call'
import { recordTrace } from '@/lib/nexora/traces/record'
import type { TraceDraft, TraceSource } from '@/lib/nexora/traces/types'

/** Who made a direct model call, and from where. */
export interface CallTraceContext {
  source: Extract<TraceSource, 'playground' | 'copilot' | 'wand' | 'api_key'>
  workspaceId: string | null
  userId: string | null
  apiKeyId?: string | null
  name: string
  /** What the personal-data policy did to the messages before they were sent, if anything. */
  protection?: ProtectionNote | null
}

interface CallResult {
  answer: string | null
  usage: { promptTokens: number; completionTokens: number } | null
  error: string | null
  reasoning?: string | null
  interrupted?: boolean
}

export interface CallTrace {
  /** Records the call's trace; the first call counts, later ones are ignored. */
  finish(result: CallResult): void
}

interface CallTraceDeps {
  now: () => number
  record: (draft: TraceDraft) => Promise<void>
}

const defaultDeps: CallTraceDeps = { now: Date.now, record: (draft) => recordTrace(draft) }

/**
 * Starts the trace of one direct model call (Playground, Copilot, « Generate with AI », a model
 * called with a developer key). `finish` is fire-and-forget: it never throws and never waits.
 */
export function beginCallTrace(
  context: CallTraceContext,
  model: string,
  messages: unknown,
  deps: CallTraceDeps = defaultDeps
): CallTrace {
  const startedAt = deps.now()
  let finished = false
  return {
    finish(result) {
      if (finished) return
      finished = true
      try {
        const draft = draftFromCall({
          source: context.source,
          workspaceId: context.workspaceId,
          userId: context.userId,
          apiKeyId: context.apiKeyId ?? null,
          name: context.name,
          protection: context.protection ?? null,
          model,
          startedAt: new Date(startedAt),
          durationMs: Math.max(0, deps.now() - startedAt),
          messages,
          ...result,
        })
        void deps.record(draft).catch(() => undefined)
      } catch {
        // A trace never disturbs the call it describes.
      }
    },
  }
}
