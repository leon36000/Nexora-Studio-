import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'
import { protectTexts } from '@/lib/nexora/data-protection/masking'
import { capDraft } from '@/lib/nexora/traces/caps'
import { co2ForSpans } from '@/lib/nexora/traces/co2'
import { exportTrace } from '@/lib/nexora/traces/otlp'
import {
  type RedactionMode,
  redactText,
  redactValue,
  withTraceMarks,
} from '@/lib/nexora/traces/redaction'
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
  'dataProtection',
])

export interface RecordDeps {
  loadSettings: () => Promise<TraceSettings>
  co2: (spans: { model: string | null; tokens: number }[]) => Promise<(number | null)[]>
  /** `false` when the trace was already stored (a replayed completion). */
  insert: (stored: StoredTrace) => Promise<boolean>
  exportTrace: (target: TraceSettings['otlp'], stored: StoredTrace) => Promise<unknown>
  /**
   * Masks what the patterns cannot know — names — with the local personal-data service. Absent, or
   * failing, the trace is stored with the pattern masking alone.
   */
  maskNames?: (texts: string[]) => Promise<{ texts: string[]; found: number }>
}

const defaultDeps: RecordDeps = {
  loadSettings: loadTraceSettings,
  co2: (spans) => co2ForSpans(spans),
  insert: insertTrace,
  exportTrace: (target, stored) => exportTrace(target, stored),
  async maskNames(texts) {
    if (!env.PII_URL?.trim()) return { texts, found: 0 }
    const protectedTexts = await protectTexts(texts)
    return {
      texts: protectedTexts.texts,
      found: Object.values(protectedTexts.found).reduce((sum, count) => sum + count, 0),
    }
  },
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

/**
 * The draft with the names the local service finds replaced, and how many pieces of text it
 * masked. A service that cannot be reached costs nothing but the names: the patterns still mask.
 */
async function maskNamesInDraft(
  draft: TraceDraft,
  deps: RecordDeps
): Promise<{ draft: TraceDraft; masked: number }> {
  if (!deps.maskNames) return { draft, masked: 0 }
  const copy: TraceDraft = { ...draft, spans: draft.spans.map((span) => ({ ...span })) }
  const texts: string[] = []
  const apply: Array<(value: string) => void> = []
  const add = (value: string | null, set: (masked: string) => void) => {
    if (!value) return
    texts.push(value)
    apply.push(set)
  }
  add(copy.input, (value) => {
    copy.input = value
  })
  add(copy.output, (value) => {
    copy.output = value
  })
  add(copy.error, (value) => {
    copy.error = value
  })
  for (const span of copy.spans) {
    add(span.input, (value) => {
      span.input = value
    })
    add(span.output, (value) => {
      span.output = value
    })
  }
  if (texts.length === 0) return { draft, masked: 0 }
  try {
    const result = await deps.maskNames(texts)
    if (result.texts.length !== texts.length) throw new Error('The service returned a short answer')
    result.texts.forEach((value, index) => apply[index](withTraceMarks(value)))
    return { draft: copy, masked: result.found }
  } catch (error) {
    logger.warn('Names could not be masked in a trace; the patterns alone masked it', {
      traceId: draft.id,
      error: getErrorMessage(error),
    })
    return { draft, masked: 0 }
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
    const named =
      settings.redaction === 'standard'
        ? await maskNamesInDraft(capped, deps)
        : { draft: capped, masked: 0 }
    const stored = buildStored(named.draft, settings.redaction, await carbon(deps, capped))
    stored.trace.maskedCount = (stored.trace.maskedCount ?? 0) + named.masked
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
