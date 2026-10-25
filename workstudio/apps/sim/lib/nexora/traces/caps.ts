import { isRecordLike } from '@sim/utils/object'
import { truncateAtCodePoint } from '@sim/utils/string'
import type { SpanDraft, TraceDraft } from '@/lib/nexora/traces/types'

/** Longest stored text of an input, an output or a long attribute. */
export const MAX_FIELD_CHARS = 8000
/** Most spans one trace keeps (the first ones, in tree order). */
export const MAX_SPANS = 500
export const TRUNCATION_MARK = ' …[tronqué]'

function cutText(text: string | null, state: { cut: boolean }): string | null {
  if (text === null || text.length <= MAX_FIELD_CHARS) return text
  state.cut = true
  return truncateAtCodePoint(text, MAX_FIELD_CHARS, TRUNCATION_MARK)
}

function cutAttributes(
  attributes: Record<string, unknown>,
  state: { cut: boolean }
): Record<string, unknown> {
  const capped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attributes)) {
    capped[key] = typeof value === 'string' ? cutText(value, state) : value
  }
  return capped
}

/** D9: bounds what one trace stores; `truncated` tells the screen when something was cut. */
export function capDraft(draft: TraceDraft): TraceDraft {
  const state = { cut: draft.truncated }
  const kept = draft.spans.slice(0, MAX_SPANS)
  if (kept.length < draft.spans.length) state.cut = true
  const spans = kept.map(
    (span): SpanDraft => ({
      ...span,
      input: cutText(span.input, state),
      output: cutText(span.output, state),
      attributes: isRecordLike(span.attributes) ? cutAttributes(span.attributes, state) : {},
    })
  )
  return {
    ...draft,
    input: cutText(draft.input, state),
    output: cutText(draft.output, state),
    error: cutText(draft.error, state),
    spans,
    truncated: state.cut,
  }
}
