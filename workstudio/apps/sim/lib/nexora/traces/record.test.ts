/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { type RecordDeps, recordTrace } from '@/lib/nexora/traces/record'
import { DEFAULT_TRACE_SETTINGS, type TraceSettings } from '@/lib/nexora/traces/settings'
import type { StoredTrace } from '@/lib/nexora/traces/stored'
import type { SpanDraft, TraceDraft } from '@/lib/nexora/traces/types'

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'
const COMPACT_IBAN = 'FR7630006000011234567890189'
const started = new Date('2026-10-25T10:00:00Z')

function span(over: Partial<SpanDraft> = {}): SpanDraft {
  return {
    id: '1'.repeat(16),
    parentId: null,
    kind: 'model',
    name: 'nexora-default',
    model: 'nexora-default',
    startedAt: started,
    durationMs: 900,
    status: 'ok',
    inputTokens: 100,
    outputTokens: 20,
    input: `user: mon IBAN est ${IBAN}`,
    output: `Je note ${COMPACT_IBAN} pour jean@exemple.fr`,
    attributes: { reasoning: `Il donne ${IBAN}`, finishReason: 'stop' },
    ...over,
  }
}

function draft(over: Partial<TraceDraft> = {}): TraceDraft {
  return {
    id: 'a'.repeat(32),
    workspaceId: 'ws-1',
    userId: 'u1',
    source: 'assistant',
    visibility: 'private',
    name: 'Assistant',
    agentId: 'wf-1',
    agentName: 'Assistant',
    apiKeyId: null,
    executionId: 'exec-1',
    status: 'error',
    error: `Échec avec ${IBAN}`,
    startedAt: started,
    durationMs: 1000,
    inputTokens: 100,
    outputTokens: 20,
    input: `mon IBAN est ${IBAN}`,
    output: `Je note ${IBAN}`,
    truncated: false,
    spans: [span()],
    ...over,
  }
}

function deps(settings: Partial<TraceSettings> = {}, over: Partial<RecordDeps> = {}) {
  const stored: StoredTrace[] = []
  const merged: TraceSettings = { ...DEFAULT_TRACE_SETTINGS, ...settings }
  const all: RecordDeps = {
    loadSettings: async () => merged,
    co2: async (items) => items.map(() => 0.001),
    insert: vi.fn(async (trace: StoredTrace) => {
      stored.push(trace)
      return true
    }),
    exportTrace: vi.fn(async () => ({ ok: true })),
    ...over,
  }
  return { all, stored }
}

describe('recordTrace — masquage', () => {
  it('ne laisse aucun IBAN, e-mail ou secret nulle part dans ce qui est stocké', async () => {
    const { all, stored } = deps()
    await recordTrace(draft(), all)
    const written = JSON.stringify(stored)
    expect(written).not.toContain('3000 6000')
    expect(written).not.toContain('7630006000')
    expect(written).not.toContain('jean@exemple.fr')
    expect(written).toContain('[IBAN]')
    expect(stored[0].trace.maskedCount).toBeGreaterThanOrEqual(6)
  })

  it('masque aussi le nom, les aperçus et le texte de recherche', async () => {
    const { all, stored } = deps()
    await recordTrace(draft({ name: `Facture ${IBAN}` }), all)
    const { trace } = stored[0]
    expect(trace.name).toBe('Facture [IBAN]')
    expect(trace.inputPreview).toBe('mon IBAN est [IBAN]')
    expect(trace.searchText).not.toContain('7890')
  })

  it('en mode « strict » ne garde aucun contenu : ni entrée, ni sortie, ni erreur, ni réflexion', async () => {
    const { all, stored } = deps({ redaction: 'strict' })
    await recordTrace(draft(), all)
    const { trace, spans } = stored[0]
    expect(trace.inputPreview).toBeNull()
    expect(trace.outputPreview).toBeNull()
    expect(trace.error).toBeNull()
    expect(trace.searchText).not.toContain('IBAN')
    expect(spans[0].input).toBeNull()
    expect(spans[0].output).toBeNull()
    expect(spans[0].attributes).toEqual({ finishReason: 'stop' })
    expect(trace.status).toBe('error')
    expect(spans[0].durationMs).toBe(900)
    expect(spans[0].inputTokens).toBe(100)
  })

  it('en mode « strict » garde pourtant ce que la barrière a masqué : des types et des nombres, aucun contenu', async () => {
    const { all, stored } = deps({ redaction: 'strict' })
    const note = { mode: 'mask', model: 'cloud-glm-5-3', found: { IBAN_CODE: 1 }, masked: 1 }
    await recordTrace(
      draft({ spans: [span({ attributes: { finishReason: 'stop', dataProtection: [note] } })] }),
      all
    )
    expect(stored[0].spans[0].attributes).toEqual({
      finishReason: 'stop',
      dataProtection: [note],
    })
  })

  it('en mode « none » garde le contenu tel quel', async () => {
    const { all, stored } = deps({ redaction: 'none' })
    await recordTrace(draft(), all)
    expect(stored[0].trace.inputPreview).toContain(IBAN)
    expect(stored[0].trace.maskedCount).toBe(0)
  })
})

describe('recordTrace — lignes écrites', () => {
  it('calcule modèles, nombre d’outils, CO₂, aperçus bornés et texte de recherche borné', async () => {
    const long = 'x'.repeat(5000)
    const { all, stored } = deps()
    await recordTrace(
      draft({
        input: long,
        spans: [
          span(),
          span({
            id: '2'.repeat(16),
            parentId: '1'.repeat(16),
            kind: 'tool',
            name: 'knowledge_search',
            model: null,
            inputTokens: 0,
            outputTokens: 0,
            input: long,
            output: long,
          }),
          span({ id: '3'.repeat(16), parentId: '1'.repeat(16), model: 'autre', name: 'autre' }),
        ],
      }),
      all
    )
    const { trace, spans } = stored[0]
    expect(trace.models).toEqual(['nexora-default', 'autre'])
    expect(trace.model).toBe('nexora-default')
    expect(trace.toolCount).toBe(1)
    expect(trace.spanCount).toBe(3)
    expect(trace.inputPreview?.length).toBeLessThanOrEqual(500)
    expect(trace.searchText?.length).toBeLessThanOrEqual(8000)
    expect(trace.kgCo2eq).toBeCloseTo(0.003, 9)
    expect(spans.map((s) => s.position)).toEqual([0, 1, 2])
    expect(spans.every((s) => s.traceId === 'a'.repeat(32))).toBe(true)
  })

  it('n’a pas de CO₂ quand rien n’est mesuré', async () => {
    const { all, stored } = deps({}, { co2: async (items) => items.map(() => null) })
    await recordTrace(draft(), all)
    expect(stored[0].trace.kgCo2eq).toBeNull()
  })

  it('écrit quand même quand le calcul du CO₂ échoue', async () => {
    const { all, stored } = deps(
      {},
      {
        co2: async () => {
          throw new Error('Nexora API injoignable')
        },
      }
    )
    await recordTrace(draft(), all)
    expect(stored).toHaveLength(1)
    expect(stored[0].trace.kgCo2eq).toBeNull()
  })

  it('coupe les contenus trop longs et marque la trace tronquée', async () => {
    const { all, stored } = deps()
    await recordTrace(draft({ spans: [span({ output: 'y'.repeat(20_000) })] }), all)
    expect(stored[0].spans[0].output?.length).toBeLessThan(8100)
    expect(stored[0].trace.truncated).toBe(true)
  })
})

describe('recordTrace — robustesse', () => {
  it('n’écrit rien quand les traces sont désactivées', async () => {
    const { all, stored } = deps({ enabled: false })
    await recordTrace(draft(), all)
    expect(all.insert).not.toHaveBeenCalled()
    expect(all.exportTrace).not.toHaveBeenCalled()
    expect(stored).toHaveLength(0)
  })

  it('ne lève jamais quand l’écriture échoue', async () => {
    const { all } = deps(
      {},
      {
        insert: async () => {
          throw new Error('base indisponible')
        },
      }
    )
    await expect(recordTrace(draft(), all)).resolves.toBeUndefined()
    expect(all.exportTrace).not.toHaveBeenCalled()
  })

  it('ne lève jamais quand la lecture des réglages échoue', async () => {
    const { all } = deps(
      {},
      {
        loadSettings: async () => {
          throw new Error('réglages illisibles')
        },
      }
    )
    await expect(recordTrace(draft(), all)).resolves.toBeUndefined()
  })
})

describe('recordTrace — export OTLP', () => {
  const otlp = {
    enabled: true,
    endpoint: 'http://collecteur.local/v1/traces',
    headers: [{ name: 'Authorization', value: 'Basic abc' }],
  }

  it('exporte la trace déjà masquée quand l’export est réglé', async () => {
    const { all } = deps({ otlp })
    await recordTrace(draft(), all)
    expect(all.exportTrace).toHaveBeenCalledTimes(1)
    const [target, sent] = vi.mocked(all.exportTrace).mock.calls[0]
    expect(target).toMatchObject({ endpoint: otlp.endpoint, headers: otlp.headers })
    expect(JSON.stringify(sent)).not.toContain('7630006000')
    expect(JSON.stringify(sent)).not.toContain('3000 6000')
  })

  it('n’exporte pas quand l’export est éteint ou quand la trace n’a pas été écrite (rejouée)', async () => {
    const off = deps()
    await recordTrace(draft(), off.all)
    expect(off.all.exportTrace).not.toHaveBeenCalled()

    const replay = deps({ otlp }, { insert: async () => false })
    await recordTrace(draft(), replay.all)
    expect(replay.all.exportTrace).not.toHaveBeenCalled()
  })

  it('ne lève pas quand l’export échoue', async () => {
    const { all } = deps(
      { otlp },
      {
        exportTrace: async () => {
          throw new Error('collecteur en panne')
        },
      }
    )
    await expect(recordTrace(draft(), all)).resolves.toBeUndefined()
  })
})

describe('recordTrace — le service de données personnelles complète les motifs', () => {
  /** Stands in for the local service: it knows « Marie Dupont » and counts what it replaced. */
  const maskNames = vi.fn(async (texts: string[]) => {
    let found = 0
    const masked = texts.map((text) => {
      if (!text.includes('Marie Dupont')) return text
      found += 1
      return text.replaceAll('Marie Dupont', '<PERSON>')
    })
    return { texts: masked, found }
  })
  const named = draft({
    input: 'Écris à Marie Dupont',
    output: 'Bonjour Marie Dupont',
    error: null,
    status: 'ok',
    spans: [span({ input: 'user: Marie Dupont', output: 'Marie Dupont, bonjour', attributes: {} })],
  })

  it('masque aussi les noms, dans la conversation et dans chaque étape, et les compte', async () => {
    const { all, stored } = deps({}, { maskNames })
    await recordTrace(named, all)
    const written = JSON.stringify(stored)
    expect(written).not.toContain('Marie Dupont')
    expect(stored[0].trace.inputPreview).toBe('Écris à <PERSON>')
    expect(stored[0].spans[0].input).toBe('user: <PERSON>')
    expect(stored[0].trace.maskedCount).toBe(4)
  })

  it('stocke quand même la trace, masquée par les motifs seuls, si le service ne répond pas', async () => {
    const failing = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const { all, stored } = deps({}, { maskNames: failing })
    await recordTrace(draft(), all)
    expect(stored).toHaveLength(1)
    expect(JSON.stringify(stored)).not.toContain('3000 6000')
  })

  it('ne demande rien au service en mode « none » ni en mode « strict »', async () => {
    const asked = vi.fn(maskNames)
    for (const redaction of ['none', 'strict'] as const) {
      const { all } = deps({ redaction }, { maskNames: asked })
      await recordTrace(named, all)
    }
    expect(asked).not.toHaveBeenCalled()
  })

  it('ne fait rien de plus quand le service n’est pas installé', async () => {
    const { all, stored } = deps({}, { maskNames: undefined })
    await recordTrace(named, all)
    expect(stored[0].trace.inputPreview).toBe('Écris à Marie Dupont')
  })
})
