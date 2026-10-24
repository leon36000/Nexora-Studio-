import { describe, expect, it } from 'vitest'
import { mergeModelCard, parseModelCards, resolveModelCard } from '@/lib/nexora/model-cards'

const glm = { name: 'cloud-glm-5-3', usage: 'chat' as const, source: 'openai-compatible' as const }
const qwen = { name: 'qwen2.5:3b', usage: 'chat' as const, source: 'ollama' as const }

describe('parseModelCards', () => {
  it('tolerates missing or broken metadata and keeps only what it understands', () => {
    expect(parseModelCards(null)).toEqual({})
    expect(parseModelCards({ nexoraModelCards: 'oops' })).toEqual({})
    expect(
      parseModelCards({
        nexoraModelCards: {
          'cloud-glm-5-3': { reasoning: true, tools: 'yes', location: 'mars', contextTokens: -5 },
          broken: 3,
        },
      })
    ).toEqual({ 'cloud-glm-5-3': { reasoning: true } })
  })
})

describe('mergeModelCard', () => {
  it('changes one card and keeps every other metadata key and card', () => {
    const metadata = {
      nexoraBudgets: { a: 1 },
      nexoraModelCards: { other: { tools: true } },
    }
    const merged = mergeModelCard(metadata, 'cloud-glm-5-3', {
      reasoning: true,
      testedAt: '2026-10-23T10:00:00.000Z',
    })
    expect(merged.nexoraBudgets).toEqual({ a: 1 })
    expect(parseModelCards(merged)).toEqual({
      other: { tools: true },
      'cloud-glm-5-3': { reasoning: true, testedAt: '2026-10-23T10:00:00.000Z' },
    })
    const again = mergeModelCard(merged, 'cloud-glm-5-3', { location: 'eu' })
    expect(parseModelCards(again)['cloud-glm-5-3']).toEqual({
      reasoning: true,
      testedAt: '2026-10-23T10:00:00.000Z',
      location: 'eu',
    })
  })

  it('clears a context length set back to null, and the whole card with null', () => {
    const withContext = mergeModelCard({}, 'm', { contextTokens: 128_000, tools: false })
    expect(parseModelCards(mergeModelCard(withContext, 'm', { contextTokens: null }))).toEqual({
      m: { tools: false },
    })
    expect(parseModelCards(mergeModelCard(withContext, 'm', null))).toEqual({})
  })
})

describe('resolveModelCard', () => {
  it('places a local model on this server and Mistral AI in the EU, without asking', () => {
    expect(resolveModelCard(qwen, { location: 'external' })).toMatchObject({
      location: 'local',
      locationEditable: false,
    })
    expect(
      resolveModelCard({ name: 'mistral-small', usage: 'chat', source: 'mistral' })
    ).toMatchObject({ location: 'eu', locationEditable: false })
  })

  it('calls an OpenAI-compatible service off the instance until an administrator says otherwise', () => {
    expect(resolveModelCard(glm)).toMatchObject({ location: 'external', locationEditable: true })
    expect(resolveModelCard(glm, { location: 'eu' })).toMatchObject({ location: 'eu' })
  })

  it('places a service of the instance itself (a bare service name) on this server by default', () => {
    const whisper = {
      name: 'whisper-small',
      usage: 'transcription' as const,
      source: 'openai-compatible' as const,
      providerUrl: 'http://whisper:8000',
    }
    expect(resolveModelCard(whisper)).toMatchObject({ location: 'local', locationEditable: true })
    expect(resolveModelCard(whisper, { location: 'external' }).location).toBe('external')
    expect(
      resolveModelCard({ ...glm, providerUrl: 'http://host.docker.internal:18090' }).location
    ).toBe('external')
  })

  it.each([
    'http://gpu-box:8000/v1',
    'http://localhost:11434/v1',
    'http://nexora-dev-ollama:11434/v1',
    'http://pc1-lan:4400/v1',
  ])(
    'keeps a dotless host that is not a service of the instance (%s) off the instance',
    (providerUrl) => {
      expect(resolveModelCard({ ...glm, providerUrl }).location).toBe('external')
    }
  )

  it('recognizes the bundled services by name whatever the port, path or case', () => {
    for (const providerUrl of [
      'http://ollama:11434/v1',
      'http://WHISPER/v1',
      'https://nexora-api:8000',
    ]) {
      expect(resolveModelCard({ ...glm, providerUrl }).location).toBe('local')
    }
  })

  it('reports unknown capabilities as unknown, and vision from the usage', () => {
    expect(resolveModelCard(glm)).toEqual({
      reasoning: null,
      tools: null,
      vision: false,
      contextTokens: null,
      location: 'external',
      locationEditable: true,
      testedAt: null,
    })
    expect(
      resolveModelCard({ name: 'qwen2.5vl:3b', usage: 'vision', source: 'ollama' }).vision
    ).toBe(true)
    expect(
      resolveModelCard(glm, { reasoning: true, tools: false, contextTokens: 200_000 })
    ).toMatchObject({ reasoning: true, tools: false, contextTokens: 200_000 })
  })
})
