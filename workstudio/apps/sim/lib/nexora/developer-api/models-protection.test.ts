/**
 * @vitest-environment node
 */
import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAdmit, mockReserve, mockCallUpstream, mockRecord, settle, release } = vi.hoisted(
  () => ({
    mockRecord: vi.fn(),
    mockAdmit: vi.fn(),
    mockReserve: vi.fn(),
    mockCallUpstream: vi.fn(),
    settle: vi.fn(),
    release: vi.fn(),
  })
)

vi.mock('@/lib/nexora/developer-api/gateway', () => ({
  admitModel: mockAdmit,
  reserveSpending: mockReserve,
}))
vi.mock('@/lib/nexora/developer-api/upstream', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/developer-api/upstream')>()),
  callUpstream: mockCallUpstream,
}))
vi.mock('@/lib/nexora/developer-api/agents', () => ({
  agentModelIds: vi.fn(),
  listApiAgents: vi.fn(),
}))
vi.mock('@/lib/nexora/traces/record', () => ({ recordTrace: mockRecord }))
vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/data-protection/model-location', () => ({
  isOffInstanceModel: vi.fn(async () => true),
}))

import { resetProtectionCache } from '@/lib/nexora/data-protection/masking'
import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import {
  relayChatCompletion,
  relayEmbeddings,
  relaySpeech,
  relayTranscription,
} from '@/lib/nexora/developer-api/models'

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'

function keyCall(workspaceId: string | null): GatewayCall {
  return {
    key: {
      id: 'key-1',
      name: 'Clé de test',
      scope: workspaceId ? 'workspace' : 'instance',
      workspaceId,
    },
    headers: {},
  } as unknown as GatewayCall
}

const body = {
  model: 'nexora-default',
  messages: [{ role: 'user', content: `Mon IBAN est ${IBAN}, écrivez à marie@exemple.fr` }],
}

async function relayError(call: GatewayCall) {
  return relayChatCompletion(call, body, new AbortController().signal).then(
    () => null,
    (error: unknown) => error
  )
}

describe('relayChatCompletion — personal-data policy', () => {
  beforeEach(() => {
    mockEnvObject.PII_URL = undefined
    resetProtectionCache()
    mockAdmit.mockResolvedValue('cloud-glm-5-3')
    mockReserve.mockResolvedValue({
      estimate: { promptTokens: 5, completionTokens: 5 },
      settle,
      release,
    })
    mockCallUpstream.mockResolvedValue(
      Response.json({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 8 } })
    )
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'refuse',
      workspaceModes: { 'ws-mask': 'mask', 'ws-open': 'allow' },
    })
  })

  it('relays the question masked for a key of a workspace that says « masquer »', async () => {
    await relayChatCompletion(keyCall('ws-mask'), body, new AbortController().signal)
    const sent = JSON.parse(mockCallUpstream.mock.calls[0][1].body)
    expect(sent.messages[0].content).toBe('Mon IBAN est [IBAN], écrivez à [E-MAIL]')
    expect(sent.model).toBe('nexora-default')
  })

  it('shows on the trace of the key’s call what was masked', async () => {
    await relayChatCompletion(keyCall('ws-mask'), body, new AbortController().signal)
    expect(mockRecord.mock.calls[0][0].spans[0].attributes.dataProtection).toEqual([
      {
        mode: 'mask',
        model: 'cloud-glm-5-3',
        found: { IBAN_CODE: 1, EMAIL_ADDRESS: 1 },
        masked: 2,
      },
    ])
  })

  it('answers 403 in the OpenAI shape, spending nothing and calling nobody, when the policy refuses', async () => {
    const error = await relayError(keyCall('ws-compta'))
    expect(error).toMatchObject({
      status: 403,
      code: 'personal_data_not_allowed',
      message: expect.stringContaining('IBAN, e-mail'),
    })
    expect(mockReserve).not.toHaveBeenCalled()
    expect(mockCallUpstream).not.toHaveBeenCalled()
  })

  it('applies the instance default to an instance key, which names no workspace', async () => {
    expect(await relayError(keyCall(null))).toMatchObject({ status: 403 })
  })

  it('relays untouched for a workspace that allows personal data', async () => {
    await relayChatCompletion(keyCall('ws-open'), body, new AbortController().signal)
    expect(JSON.parse(mockCallUpstream.mock.calls[0][1].body).messages).toEqual(body.messages)
  })

  it('answers 503 when the policy cannot be read, rather than relay unprotected', async () => {
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockRejectedValue(new Error('database down'))
    expect(await relayError(keyCall('ws-mask'))).toMatchObject({
      status: 503,
      code: 'personal_data_protection_unavailable',
    })
    expect(mockCallUpstream).not.toHaveBeenCalled()
  })
})

describe('the other calls of the gateway — personal-data policy', () => {
  const signal = new AbortController().signal
  const sentBody = () => JSON.parse(mockCallUpstream.mock.calls[0][1].body)

  beforeEach(() => {
    mockEnvObject.PII_URL = undefined
    resetProtectionCache()
    mockAdmit.mockResolvedValue('nomic-embed')
    mockReserve.mockResolvedValue({
      estimate: { promptTokens: 5, completionTokens: 0 },
      settle,
      release,
    })
    mockCallUpstream.mockImplementation(async () =>
      Response.json({ data: [{ embedding: [0.1] }], usage: { prompt_tokens: 3 } })
    )
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'refuse',
      workspaceModes: { 'ws-mask': 'mask', 'ws-open': 'allow' },
    })
  })

  describe('embeddings', () => {
    const texts = [`Mon IBAN est ${IBAN}`, 'une phrase propre']

    it('masks every text of the input for a workspace that says « masquer »', async () => {
      await relayEmbeddings(keyCall('ws-mask'), { model: 'nomic-embed', input: texts }, signal)
      expect(sentBody().input).toEqual(['Mon IBAN est [IBAN]', 'une phrase propre'])
    })

    it('masks a single text input too, and leaves token lists alone', async () => {
      await relayEmbeddings(keyCall('ws-mask'), { model: 'nomic-embed', input: texts[0] }, signal)
      expect(sentBody().input).toBe('Mon IBAN est [IBAN]')
      mockCallUpstream.mockClear()
      await relayEmbeddings(
        keyCall('ws-mask'),
        { model: 'nomic-embed', input: [[1, 2, 3]] },
        signal
      )
      expect(sentBody().input).toEqual([[1, 2, 3]])
    })

    it('answers 403, spending nothing and calling nobody, when the policy refuses', async () => {
      await expect(
        relayEmbeddings(keyCall('ws-compta'), { model: 'nomic-embed', input: texts }, signal)
      ).rejects.toMatchObject({ status: 403, code: 'personal_data_not_allowed' })
      expect(mockReserve).not.toHaveBeenCalled()
      expect(mockCallUpstream).not.toHaveBeenCalled()
    })

    it('relays untouched for a workspace that allows personal data', async () => {
      await relayEmbeddings(keyCall('ws-open'), { model: 'nomic-embed', input: texts }, signal)
      expect(sentBody().input).toEqual(texts)
    })

    it('answers 503 when the policy cannot be read, rather than relay unprotected', async () => {
      nexoraDataProtectionMockFns.mockLoadDataProtection.mockRejectedValue(new Error('db down'))
      await expect(
        relayEmbeddings(keyCall('ws-mask'), { model: 'nomic-embed', input: texts }, signal)
      ).rejects.toMatchObject({ status: 503, code: 'personal_data_protection_unavailable' })
      expect(mockCallUpstream).not.toHaveBeenCalled()
    })
  })

  describe('speech and transcription, which cannot be masked', () => {
    const form = () => {
      const data = new FormData()
      data.append('model', 'whisper')
      data.append('file', new Blob(['audio']), 'a.mp3')
      return data
    }

    it('refuses to read a text aloud with a model off the instance when the workspace protects its data', async () => {
      for (const workspace of ['ws-mask', 'ws-compta']) {
        await expect(
          relaySpeech(keyCall(workspace), { model: 'tts', input: 'Bonjour' }, signal)
        ).rejects.toMatchObject({ status: 403, code: 'personal_data_not_allowed' })
      }
      expect(mockReserve).not.toHaveBeenCalled()
      expect(mockCallUpstream).not.toHaveBeenCalled()
    })

    it('refuses to transcribe a recording with a model off the instance when the workspace protects its data', async () => {
      for (const workspace of ['ws-mask', 'ws-compta']) {
        await expect(relayTranscription(keyCall(workspace), form(), signal)).rejects.toMatchObject({
          status: 403,
          code: 'personal_data_not_allowed',
        })
      }
      expect(mockCallUpstream).not.toHaveBeenCalled()
    })

    it('relays both for a workspace that allows personal data', async () => {
      mockCallUpstream.mockImplementation(async () => new Response('audio'))
      await relaySpeech(keyCall('ws-open'), { model: 'tts', input: 'Bonjour' }, signal)
      await relayTranscription(keyCall('ws-open'), form(), signal)
      expect(mockCallUpstream).toHaveBeenCalledTimes(2)
    })

    it('stops with a 503 when the policy cannot be read', async () => {
      nexoraDataProtectionMockFns.mockLoadDataProtection.mockRejectedValue(new Error('db down'))
      await expect(
        relaySpeech(keyCall('ws-open'), { model: 'tts', input: 'Bonjour' }, signal)
      ).rejects.toMatchObject({ status: 503 })
    })
  })
})
