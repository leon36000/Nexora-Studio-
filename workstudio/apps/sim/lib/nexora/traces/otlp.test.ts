/**
 * @vitest-environment node
 */
import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import {
  buildOtlpPayload,
  exportTrace,
  lastExportStatus,
  sendTestSpan,
} from '@/lib/nexora/traces/otlp'
import type { StoredTrace } from '@/lib/nexora/traces/stored'

const started = new Date('2026-10-25T10:00:00.000Z')

function stored(): StoredTrace {
  return {
    trace: {
      id: 'a'.repeat(32),
      workspaceId: 'ws-1',
      source: 'assistant',
      visibility: 'private',
      name: 'Assistant général',
      agentName: 'Assistant général',
      model: 'nexora-default',
      status: 'ok',
      startedAt: started,
      durationMs: 2000,
      kgCo2eq: 0.00012,
    },
    spans: [
      {
        traceId: 'a'.repeat(32),
        id: '1'.repeat(16),
        parentId: null,
        position: 0,
        kind: 'step',
        name: 'Assistant général',
        startedAt: started,
        durationMs: 2000,
        status: 'ok',
        inputTokens: 0,
        outputTokens: 0,
        attributes: {},
      },
      {
        traceId: 'a'.repeat(32),
        id: '2'.repeat(16),
        parentId: '1'.repeat(16),
        position: 1,
        kind: 'model',
        name: 'nexora-default',
        model: 'nexora-default',
        startedAt: new Date(started.getTime() + 100),
        durationMs: 800,
        status: 'ok',
        inputTokens: 400,
        outputTokens: 20,
        kgCo2eq: 0.0001,
        input: 'user: Bonjour',
        output: 'Salut',
        attributes: {},
      },
      {
        traceId: 'a'.repeat(32),
        id: '3'.repeat(16),
        parentId: '1'.repeat(16),
        position: 2,
        kind: 'tool',
        name: 'knowledge_search',
        startedAt: new Date(started.getTime() + 900),
        durationMs: 50,
        status: 'error',
        inputTokens: 0,
        outputTokens: 0,
        input: '{"query":"x"}',
        attributes: {},
      },
    ],
  }
}

function attr(span: { attributes: { key: string; value: Record<string, unknown> }[] }, key: string) {
  return span.attributes.find((entry) => entry.key === key)?.value
}

describe('buildOtlpPayload', () => {
  it('suit la forme OTLP/HTTP JSON : identifiants, parents, temps en nanosecondes', () => {
    const payload = buildOtlpPayload(stored())
    const spans = payload.resourceSpans[0].scopeSpans[0].spans
    expect(spans).toHaveLength(3)
    expect(spans[0]).toMatchObject({
      traceId: 'a'.repeat(32),
      spanId: '1'.repeat(16),
      parentSpanId: '',
      name: 'Assistant général',
      startTimeUnixNano: '1792922400000000000',
      endTimeUnixNano: '1792922402000000000',
    })
    expect(spans[1].parentSpanId).toBe('1'.repeat(16))
    expect(spans.every((s) => /^[0-9a-f]{32}$/.test(s.traceId) && /^[0-9a-f]{16}$/.test(s.spanId))).toBe(true)
    expect(payload.resourceSpans[0].resource.attributes).toContainEqual({
      key: 'service.name',
      value: { stringValue: 'nexora-workstudio' },
    })
  })

  it('marque l’erreur et nomme les attributs gen_ai d’un appel de modèle', () => {
    const spans = buildOtlpPayload(stored()).resourceSpans[0].scopeSpans[0].spans
    expect(spans[0].status.code).toBe(1)
    expect(spans[2].status.code).toBe(2)
    expect(attr(spans[1], 'gen_ai.operation.name')).toEqual({ stringValue: 'chat' })
    expect(attr(spans[1], 'gen_ai.request.model')).toEqual({ stringValue: 'nexora-default' })
    expect(attr(spans[1], 'gen_ai.usage.input_tokens')).toEqual({ intValue: '400' })
    expect(attr(spans[1], 'gen_ai.usage.output_tokens')).toEqual({ intValue: '20' })
    expect(attr(spans[1], 'input.value')).toEqual({ stringValue: 'user: Bonjour' })
    expect(attr(spans[1], 'output.value')).toEqual({ stringValue: 'Salut' })
    expect(attr(spans[2], 'gen_ai.operation.name')).toEqual({ stringValue: 'execute_tool' })
    expect(attr(spans[2], 'gen_ai.tool.name')).toEqual({ stringValue: 'knowledge_search' })
  })

  it('porte la source, l’espace et le CO₂ de la trace sur le span racine', () => {
    const root = buildOtlpPayload(stored()).resourceSpans[0].scopeSpans[0].spans[0]
    expect(attr(root, 'nexora.source')).toEqual({ stringValue: 'assistant' })
    expect(attr(root, 'nexora.workspace_id')).toEqual({ stringValue: 'ws-1' })
    expect(attr(root, 'nexora.kg_co2eq')).toEqual({ doubleValue: 0.00012 })
  })
})

describe('exportTrace', () => {
  const settings = {
    enabled: true,
    endpoint: 'http://collecteur.local:4318/v1/traces',
    headers: [{ name: 'Authorization', value: 'Basic abc' }],
  }

  it('envoie la charge en POST JSON avec les en-têtes réglés et un délai', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(result).toEqual({ ok: true, status: 200 })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://collecteur.local:4318/v1/traces')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Basic abc' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(init.body as string).resourceSpans).toHaveLength(1)
  })

  it('retente une fois sur une erreur serveur, puis renonce sans lever', async () => {
    const fetchFn = vi.fn(async () => new Response('boom', { status: 500 }))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ ok: false, status: 500 })
  })

  it('ne retente pas un refus du collecteur (4xx)', async () => {
    const fetchFn = vi.fn(async () => new Response('non', { status: 401 }))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ ok: false, status: 401 })
  })

  it('réussit au second essai après une coupure réseau', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse({}))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(result.ok).toBe(true)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('renonce sans lever quand le collecteur est injoignable, et le dit', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')
    expect(lastExportStatus()).toMatchObject({ ok: false })
  })

  it('ne laisse jamais une valeur d’en-tête dans le dernier état ni dans l’erreur', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('refus de Basic abc'))
    const result = await exportTrace(settings, stored(), fetchFn as unknown as typeof fetch)
    expect(JSON.stringify(result)).not.toContain('Basic abc')
    expect(JSON.stringify(lastExportStatus())).not.toContain('Basic abc')
  })
})

describe('sendTestSpan', () => {
  it('envoie un span de test au collecteur réglé', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}))
    const result = await sendTestSpan(
      { enabled: false, endpoint: 'https://c.example/v1/traces', headers: [] },
      fetchFn as unknown as typeof fetch
    )
    expect(result.ok).toBe(true)
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.resourceSpans[0].scopeSpans[0].spans[0].name).toBe('nexora.test')
  })

  it('refuse sans adresse', async () => {
    const result = await sendTestSpan({ enabled: false, endpoint: '', headers: [] }, vi.fn() as unknown as typeof fetch)
    expect(result.ok).toBe(false)
  })
})
