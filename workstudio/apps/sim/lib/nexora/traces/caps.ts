import { isRecordLike } from '@sim/utils/object'
import { truncateAtCodePoint } from '@sim/utils/string'
import type { SpanDraft, TraceDraft } from '@/lib/nexora/traces/types'

/** Longest stored text of an input, an output or a long attribute. */
export const MAX_FIELD_CHARS = 8000
/** Most spans one trace keeps (the first ones, in tree order). */
export const MAX_SPANS = 500
export const TRUNCATION_MARK = ' …[tronqué]'

/** Rewrites a text before it is cut, so that nothing the rewrite recognises is cut in two. */
type TextRewrite = (text: string) => string

interface CutState {
  cut: boolean
  rewrite?: TextRewrite
}

function cutText(text: string | null, state: CutState): string | null {
  if (text === null) return text
  const whole = state.rewrite ? state.rewrite(text) : text
  if (whole.length <= MAX_FIELD_CHARS) return whole
  state.cut = true
  return truncateAtCodePoint(whole, MAX_FIELD_CHARS, TRUNCATION_MARK)
}

function cutAttributes(
  attributes: Record<string, unknown>,
  state: CutState
): Record<string, unknown> {
  const capped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attributes)) {
    capped[key] = typeof value === 'string' ? cutText(value, state) : value
  }
  return capped
}

/**
 * D9: bounds what one trace stores; `truncated` tells the screen when something was cut. With a
 * `rewrite` (the masking of personal data), each text is rewritten whole first and cut after, so
 * an IBAN or an address straddling the limit is masked, not left as a fragment no pattern knows.
 */
export function capDraft(draft: TraceDraft, rewrite?: TextRewrite): TraceDraft {
  const state: CutState = { cut: draft.truncated, rewrite }
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
