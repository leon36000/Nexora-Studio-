import { describe, expect, it } from 'vitest'
import {
  buildLocationIndex,
  isOffInstanceModel,
  type LocationSources,
} from '@/lib/nexora/data-protection/model-location'
import type { NexoraModel } from '@/lib/nexora/model-admin'

function model(overrides: Partial<NexoraModel> & Pick<NexoraModel, 'name'>): NexoraModel {
  return {
    id: 1,
    isDefault: false,
    usage: 'chat',
    source: 'openai-compatible',
    providerModel: overrides.name,
    providerUrl: 'http://host.docker.internal:18090/v1',
    ...overrides,
  }
}

const glm = model({ name: 'cloud-glm-5-3', isDefault: true })
const qwen = model({
  name: 'qwen2.5:7b',
  id: 2,
  source: 'ollama',
  providerUrl: 'http://ollama:11434',
})
const mistral = model({ name: 'mistral-small', id: 3, source: 'mistral', providerUrl: null })
const whisper = model({
  name: 'whisper-small',
  id: 4,
  usage: 'transcription',
  providerUrl: 'http://whisper:8000',
})

function sources(overrides: Partial<LocationSources> = {}): LocationSources {
  return {
    adminModels: async () => [glm, qwen, mistral, whisper],
    cards: async () => ({}),
    aliases: async () => [
      { id: 'cloud-glm-5-3', aliases: ['nexora-default', 'Assistant'] },
      { id: 'qwen2.5:7b', aliases: ['local'] },
    ],
    ...overrides,
  }
}

async function offInstance(id: string, overrides: Partial<LocationSources> = {}) {
  return isOffInstanceModel(id, await buildLocationIndex(sources(overrides)))
}

describe('isOffInstanceModel', () => {
  it('says a model reached by a tunnel or an OpenAI-compatible URL is off the instance, under any spelling', async () => {
    for (const id of [
      'vllm/cloud-glm-5-3',
      'cloud-glm-5-3',
      'VLLM/CLOUD-GLM-5-3',
      ' vllm/cloud-glm-5-3 ',
    ]) {
      expect(await offInstance(id)).toBe(true)
    }
  })

  it('follows an alias to the model it designates', async () => {
    expect(await offInstance('vllm/nexora-default')).toBe(true)
    expect(await offInstance('nexora-default')).toBe(true)
    expect(await offInstance('vllm/Assistant')).toBe(true)
    expect(await offInstance('vllm/local')).toBe(false)
  })

  it('keeps a model of the bundled Ollama and a bundled service on this server', async () => {
    expect(await offInstance('vllm/qwen2.5:7b')).toBe(false)
    expect(await offInstance('ollama/qwen2.5:7b')).toBe(false)
    expect(await offInstance('vllm/whisper-small')).toBe(false)
  })

  it('does not count the EU hosting of Mistral as off the instance', async () => {
    expect(await offInstance('vllm/mistral-small')).toBe(false)
  })

  it('obeys the location an administrator declared on the card', async () => {
    const cards = async () => ({
      'cloud-glm-5-3': { location: 'local' as const },
      'qwen2.5:7b': { location: 'external' as const },
    })
    expect(await offInstance('vllm/cloud-glm-5-3', { cards })).toBe(false)
    expect(await offInstance('vllm/nexora-default', { cards })).toBe(false)
    expect(await offInstance('vllm/qwen2.5:7b', { cards })).toBe(false)
  })

  it('treats a model it does not know as off the instance, the prudent answer', async () => {
    expect(await offInstance('vllm/modele-inconnu')).toBe(true)
  })

  it('treats a cloud provider model as off the instance', async () => {
    expect(await offInstance('gpt-4o')).toBe(true)
    expect(await offInstance('claude-sonnet-4-5')).toBe(true)
  })

  it('still resolves the names and the default alias when the alias list is unavailable', async () => {
    const aliases = async () => {
      throw new Error('Nexora API unreachable')
    }
    expect(await offInstance('vllm/cloud-glm-5-3', { aliases })).toBe(true)
    expect(await offInstance('vllm/nexora-default', { aliases })).toBe(true)
    expect(await offInstance('vllm/qwen2.5:7b', { aliases })).toBe(false)
  })

  it('answers « off the instance » for every Nexora model when the model list cannot be read', async () => {
    const adminModels = async () => {
      throw new Error('administration unreachable')
    }
    expect(await offInstance('vllm/qwen2.5:7b', { adminModels })).toBe(true)
    expect(await offInstance('ollama/qwen2.5:7b', { adminModels })).toBe(false)
  })
})
