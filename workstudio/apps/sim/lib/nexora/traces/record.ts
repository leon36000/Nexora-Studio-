import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { capDraft } from '@/lib/nexora/traces/caps'
import { co2ForSpans } from '@/lib/nexora/traces/co2'
import { exportTrace } from '@/lib/nexora/traces/otlp'
import { type RedactionMode, redactText, redactValue } from '@/lib/nexora/traces/redaction'
import { insertTrace } from '@/lib/nexora/traces/repository'
import { loadTraceSettings, type TraceSettings } from '@/lib/nexora/traces/settings'
import type { StoredTrace } from '@/lib/nexora/traces/stored'
import type { SpanDraft, TraceDraft } from '@/lib/nexora/traces/types'

const logger = createLogger('NexoraTraces')

const PREVIEW_CHARS = 500
const SEARCH_TEXT_CHARS = 8000
/** In `strict` mode only these structural attributes are kept: no text a person or a model wrote. */
const STRUCTURAL_ATTRIBUTES = new Set([
  'blockType',
  'finishReason',
  'provider',
  'ttftMs',
  'toolCallId',
  'errorType',
  'toolCalls',
])

export interface RecordDeps {
  loadSettings: () => Promise<TraceSettings>
  co2: (spans: { model: string | null; tokens: number }[]) => Promise<(number | null)[]>
  /** `false` when the trace was already stored (a replayed completion). */
  insert: (stored: StoredTrace) => Promise<boolean>
  exportTrace: (target: TraceSettings['otlp'], stored: StoredTrace) => Promise<unknown>
}

const defaultDeps: RecordDeps = {
  loadSettings: loadTraceSettings,
  co2: (spans) => co2ForSpans(spans),
  insert: insertTrace,
  exportTrace: (target, stored) => exportTrace(target, stored),
}

interface Masking {
  text: (value: string | null) => string | null
  masked: () => number
}

function masking(mode: RedactionMode): Masking {
  let masked = 0
  return {
    text(value) {
      if (value === null) return null
      if (mode === 'strict') return null
      const outcome = redactText(value, mode)
      masked += outcome.masked
      return outcome.text
    },
    masked: () => masked,
  }
}

function maskSpan(
  span: SpanDraft,
  mode: RedactionMode,
  mask: Masking,
  counted: { n: number }
): SpanDraft {
  let attributes: Record<string, unknown>
  if (mode === 'strict') {
    attributes = Object.fromEntries(
      Object.entries(span.attributes).filter(([key]) => STRUCTURAL_ATTRIBUTES.has(key))
    )
  } else {
    const outcome = redactValue(span.attributes, mode)
    counted.n += outcome.masked
    attributes = outcome.value
  }
  return {
    ...span,
    name: mode === 'strict' ? span.name : (mask.text(span.name) ?? span.name),
    input: mask.text(span.input),
    output: mask.text(span.output),
    attributes,
  }
}

function joined(parts: (string | null)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join('\n')
}

function buildStored(draft: TraceDraft, mode: RedactionMode, co2: (number | null)[]): StoredTrace {
  const mask = masking(mode)
  const counted = { n: 0 }
  const spans = draft.spans.map((span) => maskSpan(span, mode, mask, counted))
  const input = mask.text(draft.input)
  const output = mask.text(draft.output)
  const name = mode === 'strict' ? draft.name : (mask.text(draft.name) ?? draft.name)
  const measured = co2.filter((value): value is number => value !== null)
  const models = [...new Set(spans.flatMap((span) => (span.model ? [span.model] : [])))]
  return {
    trace: {
      id: draft.id,
      workspaceId: draft.workspaceId,
      userId: draft.userId,
      apiKeyId: draft.apiKeyId,
      source: draft.source,
      visibility: draft.visibility,
      name,
      agentId: draft.agentId,
      agentName: mode === 'strict' ? draft.agentName : mask.text(draft.agentName),
      model: models[0] ?? null,
      models,
      status: draft.status,
      error: mask.text(draft.error),
      startedAt: draft.startedAt,
      durationMs: draft.durationMs,
      inputTokens: draft.inputTokens,
      outputTokens: draft.outputTokens,
      kgCo2eq: measured.length > 0 ? measured.reduce((sum, value) => sum + value, 0) : null,
      spanCount: spans.length,
      toolCount: spans.filter((span) => span.kind !== 'model' && span.kind !== 'step').length,
      truncated: draft.truncated,
      maskedCount: mask.masked() + counted.n,
      executionId: draft.executionId,
      inputPreview: input?.slice(0, PREVIEW_CHARS) ?? null,
      outputPreview: output?.slice(0, PREVIEW_CHARS) ?? null,
      searchText:
        joined([name, input, output, ...spans.flatMap((span) => [span.input, span.output])]).slice(
          0,
          SEARCH_TEXT_CHARS
        ) || null,
    },
    spans: spans.map((span, position) => ({
      traceId: draft.id,
      id: span.id,
      parentId: span.parentId,
      position,
      kind: span.kind,
      name: span.name,
      model: span.model,
      startedAt: span.startedAt,
      durationMs: span.durationMs,
      status: span.status,
      inputTokens: span.inputTokens,
      outputTokens: span.outputTokens,
      kgCo2eq: co2[position] ?? null,
      input: span.input,
      output: span.output,
      attributes: span.attributes,
    })),
  }
}

async function carbon(deps: RecordDeps, draft: TraceDraft): Promise<(number | null)[]> {
  try {
    return await deps.co2(
      draft.spans.map((span) => ({
        model: span.model,
        tokens: span.inputTokens + span.outputTokens,
      }))
    )
  } catch (error) {
    logger.warn('Trace carbon footprint could not be computed', { error: getErrorMessage(error) })
    return draft.spans.map(() => null)
  }
}

/**
 * Stores one trace: capped, masked as the instance's settings say, with its carbon footprint,
 * then handed to the OTLP export when one is set. Fire-and-forget by design: a trace must never
 * slow down or fail the call it describes, so this never throws.
 */
export async function recordTrace(
  draft: TraceDraft,
  deps: RecordDeps = defaultDeps
): Promise<void> {
  try {
    const settings = await deps.loadSettings()
    if (!settings.enabled) return
    const capped = capDraft(draft)
    const stored = buildStored(capped, settings.redaction, await carbon(deps, capped))
    const inserted = await deps.insert(stored)
    if (inserted && settings.otlp.enabled && settings.otlp.endpoint) {
      await deps.exportTrace(settings.otlp, stored)
    }
  } catch (error) {
    logger.error('A trace could not be recorded', {
      traceId: draft.id,
      source: draft.source,
      error: getErrorMessage(error),
    })
  }
}
