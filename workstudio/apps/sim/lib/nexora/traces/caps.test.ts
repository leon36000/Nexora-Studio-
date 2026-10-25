/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { capDraft, MAX_FIELD_CHARS, MAX_SPANS, TRUNCATION_MARK } from '@/lib/nexora/traces/caps'
import type { SpanDraft, TraceDraft } from '@/lib/nexora/traces/types'

function span(index: number, parentId: string | null, over: Partial<SpanDraft> = {}): SpanDraft {
  return {
    id: `s${index}`,
    parentId,
    kind: 'step',
    name: `étape ${index}`,
    model: null,
    startedAt: new Date('2026-10-25T00:00:00Z'),
    durationMs: 1,
    status: 'ok',
    inputTokens: 0,
    outputTokens: 0,
    input: null,
    output: null,
    attributes: {},
    ...over,
  }
}

function draft(spans: SpanDraft[], over: Partial<TraceDraft> = {}): TraceDraft {
  return {
    id: 't',
    workspaceId: 'w',
    userId: 'u',
    source: 'playground',
    visibility: 'private',
    name: 'essai',
    agentId: null,
    agentName: null,
    apiKeyId: null,
    executionId: null,
    status: 'ok',
    error: null,
    startedAt: new Date('2026-10-25T00:00:00Z'),
    durationMs: 10,
    inputTokens: 0,
    outputTokens: 0,
    input: null,
    output: null,
    truncated: false,
    spans,
    ...over,
  }
}

describe('capDraft', () => {
  it('coupe une entrée ou une sortie trop longue et signale la trace tronquée', () => {
    const long = 'a'.repeat(MAX_FIELD_CHARS + 500)
    const capped = capDraft(draft([span(0, null, { input: long, output: 'court' })]))
    expect(capped.spans[0].input?.length).toBe(MAX_FIELD_CHARS + TRUNCATION_MARK.length)
    expect(capped.spans[0].input?.endsWith(TRUNCATION_MARK)).toBe(true)
    expect(capped.spans[0].output).toBe('court')
    expect(capped.truncated).toBe(true)
  })

  it('ne touche pas une trace dans les limites', () => {
    const original = draft([span(0, null, { input: 'a'.repeat(MAX_FIELD_CHARS) })])
    const capped = capDraft(original)
    expect(capped).toEqual(original)
    expect(capped.truncated).toBe(false)
  })

  it('garde les 500 premiers spans, tous rattachés à un parent présent', () => {
    const spans = [span(0, null)]
    for (let index = 1; index < MAX_SPANS + 100; index++) spans.push(span(index, `s${index - 1}`))
    const capped = capDraft(draft(spans))
    expect(capped.spans).toHaveLength(MAX_SPANS)
    expect(capped.truncated).toBe(true)
    const ids = new Set(capped.spans.map((s) => s.id))
    expect(capped.spans.every((s) => s.parentId === null || ids.has(s.parentId))).toBe(true)
  })

  it('coupe aussi les aperçus de la conversation et les textes d’attributs', () => {
    const long = 'b'.repeat(MAX_FIELD_CHARS * 2)
    const capped = capDraft(
      draft([span(0, null, { attributes: { reasoning: long, n: 3 } })], { input: long, output: long })
    )
    expect(capped.input?.length).toBeLessThanOrEqual(MAX_FIELD_CHARS + TRUNCATION_MARK.length)
    expect(capped.output?.length).toBeLessThanOrEqual(MAX_FIELD_CHARS + TRUNCATION_MARK.length)
    expect((capped.spans[0].attributes.reasoning as string).length).toBeLessThanOrEqual(
      MAX_FIELD_CHARS + TRUNCATION_MARK.length
    )
    expect(capped.spans[0].attributes.n).toBe(3)
  })

  it('ne coupe pas au milieu d’une paire de substitution (emoji)', () => {
    const text = `${'a'.repeat(MAX_FIELD_CHARS - 1)}😀 fin`
    const capped = capDraft(draft([span(0, null, { input: text })]))
    expect(capped.spans[0].input).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/)
  })
})
