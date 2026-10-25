import { describe, expect, it, vi } from 'vitest'
import {
  PersonalDataRefusedError,
  PersonalDataServiceError,
} from '@/lib/nexora/data-protection/errors'
import { type GuardDeps, guardChatMessages, guardTexts } from '@/lib/nexora/data-protection/guard'
import type { DataProtectionPolicy } from '@/lib/nexora/data-protection/policy'

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'

/** Masks the IBAN and the name « Marie Dupont » the way the real masking reports them. */
function protect(texts: readonly string[]) {
  const found: Record<string, number> = {}
  const masked = texts.map((text) => {
    let result = text
    if (result.includes(IBAN)) {
      found.IBAN_CODE = (found.IBAN_CODE ?? 0) + 1
      result = result.replaceAll(IBAN, '[IBAN]')
    }
    if (result.includes('Marie Dupont')) {
      found.PERSON = (found.PERSON ?? 0) + 1
      result = result.replaceAll('Marie Dupont', '<PERSON>')
    }
    return result
  })
  return Promise.resolve({ texts: masked, found })
}

function setup(
  policy: DataProtectionPolicy,
  options: { offInstance?: boolean } = {}
): { deps: GuardDeps; protectSpy: ReturnType<typeof vi.fn>; locateSpy: ReturnType<typeof vi.fn> } {
  const protectSpy = vi.fn(protect)
  const locateSpy = vi.fn(async () => options.offInstance ?? true)
  return {
    deps: { loadPolicy: async () => policy, isOffInstance: locateSpy, protect: protectSpy },
    protectSpy,
    locateSpy,
  }
}

const mask: DataProtectionPolicy = { defaultMode: 'mask', workspaceModes: {} }
const refuse: DataProtectionPolicy = { defaultMode: 'refuse', workspaceModes: {} }
const allow: DataProtectionPolicy = { defaultMode: 'allow', workspaceModes: {} }

const conversation = [
  { role: 'system', content: 'Tu aides Marie Dupont.' },
  { role: 'user', content: `Mon IBAN est ${IBAN}` },
]

describe('guardChatMessages', () => {
  it('lets everything through, untouched and unasked, when the policy allows', async () => {
    const { deps, protectSpy, locateSpy } = setup(allow)
    const result = await guardChatMessages(
      { messages: conversation, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toBe(conversation)
    expect(result.applied).toBeNull()
    expect(protectSpy).not.toHaveBeenCalled()
    expect(locateSpy).not.toHaveBeenCalled()
  })

  it('sends a model on this server what it is given, and does not call the service', async () => {
    const { deps, protectSpy } = setup(mask, { offInstance: false })
    const result = await guardChatMessages(
      { messages: conversation, model: 'vllm/qwen2.5:7b', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toBe(conversation)
    expect(result.applied).toBeNull()
    expect(protectSpy).not.toHaveBeenCalled()
  })

  it('masks what leaves for a model off the instance, on a copy, and says what it did', async () => {
    const { deps } = setup(mask)
    const result = await guardChatMessages(
      { messages: conversation, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toEqual([
      { role: 'system', content: 'Tu aides <PERSON>.' },
      { role: 'user', content: 'Mon IBAN est [IBAN]' },
    ])
    expect(conversation[1].content).toContain(IBAN)
    expect(result.applied).toEqual({
      mode: 'mask',
      model: 'vllm/cloud-glm-5-3',
      found: { IBAN_CODE: 1, PERSON: 1 },
      masked: 2,
    })
  })

  it('returns the very same messages, with no note, when there was nothing to mask', async () => {
    const { deps } = setup(mask)
    const clean = [{ role: 'user', content: 'Bonjour, quel temps à Paris ?' }]
    const result = await guardChatMessages(
      { messages: clean, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toBe(clean)
    expect(result.applied).toBeNull()
  })

  it('masks the text parts of a message and keeps images, tool names and empty content as they are', async () => {
    const { deps } = setup(mask)
    const image = { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }
    const toolCalls = [{ id: 'call-1', type: 'function', function: { name: 'f', arguments: '{}' } }]
    const messages = [
      { role: 'user', content: [{ type: 'text', text: `IBAN ${IBAN}` }, image] },
      { role: 'assistant', content: null, tool_calls: toolCalls },
      { role: 'tool', tool_call_id: 'call-1', content: 'Résultat pour Marie Dupont' },
    ]
    const result = await guardChatMessages(
      { messages, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'IBAN [IBAN]' }, image] },
      { role: 'assistant', content: null, tool_calls: toolCalls },
      { role: 'tool', tool_call_id: 'call-1', content: 'Résultat pour <PERSON>' },
    ])
    expect((result.messages[0].content as unknown[])[1]).toBe(image)
  })

  it('masks the arguments of the tool calls an assistant message carries, on a copy', async () => {
    const { deps } = setup(mask)
    const messages = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'c1',
            type: 'function',
            function: { name: 'virement', arguments: `{"iban":"${IBAN}"}` },
          },
          { id: 'c2', type: 'function', function: { name: 'rien', arguments: '{}' } },
        ],
      },
    ]
    const result = await guardChatMessages(
      { messages, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages[0]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'virement', arguments: '{"iban":"[IBAN]"}' },
        },
        { id: 'c2', type: 'function', function: { name: 'rien', arguments: '{}' } },
      ],
    })
    expect(messages[0].tool_calls[0].function.arguments).toContain(IBAN)
    expect(result.applied).toMatchObject({ mode: 'mask', masked: 1 })
  })

  it('refuses a request whose only personal data is in a tool call', async () => {
    const { deps } = setup(refuse)
    const messages = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'c1',
            type: 'function',
            function: { name: 'virement', arguments: `{"iban":"${IBAN}"}` },
          },
        ],
      },
    ]
    await expect(
      guardChatMessages({ messages, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' }, deps)
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
  })

  it('refuses, naming what it found, and sends nothing, when the policy says so', async () => {
    const { deps } = setup(refuse)
    const attempt = guardChatMessages(
      { messages: conversation, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    await expect(attempt).rejects.toBeInstanceOf(PersonalDataRefusedError)
    await expect(attempt).rejects.toMatchObject({
      status: 403,
      found: { IBAN_CODE: 1, PERSON: 1 },
      message: expect.stringContaining('IBAN, nom de personne'),
    })
  })

  it('does not refuse a request that holds no personal data', async () => {
    const { deps } = setup(refuse)
    const clean = [{ role: 'user', content: 'Résume ce devis.' }]
    const result = await guardChatMessages(
      { messages: clean, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
      deps
    )
    expect(result.messages).toBe(clean)
    expect(result.applied).toBeNull()
  })

  it('applies the mode of the workspace, and the instance default to a call without workspace', async () => {
    const { deps } = setup({ defaultMode: 'mask', workspaceModes: { 'ws-compta': 'refuse' } })
    const input = { messages: conversation, model: 'vllm/cloud-glm-5-3' }
    await expect(
      guardChatMessages({ ...input, workspaceId: 'ws-compta' }, deps)
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
    expect((await guardChatMessages({ ...input, workspaceId: null }, deps)).applied?.mode).toBe(
      'mask'
    )
    expect(
      (await guardChatMessages({ ...input, workspaceId: 'ws-ventes' }, deps)).applied?.mode
    ).toBe('mask')
  })

  it('stops the request, rather than send it unprotected, when the policy cannot be read', async () => {
    const { deps } = setup(mask)
    deps.loadPolicy = async () => {
      throw new Error('database down')
    }
    await expect(
      guardChatMessages(
        { messages: conversation, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
        deps
      )
    ).rejects.toBeInstanceOf(PersonalDataServiceError)
  })

  it('lets the error of the service reach the caller', async () => {
    const { deps } = setup(mask)
    deps.protect = async () => {
      throw new PersonalDataServiceError()
    }
    await expect(
      guardChatMessages(
        { messages: conversation, model: 'vllm/cloud-glm-5-3', workspaceId: 'ws-1' },
        deps
      )
    ).rejects.toBeInstanceOf(PersonalDataServiceError)
  })
})

describe('guardTexts', () => {
  it('lets texts through, untouched and unasked, when the policy allows', async () => {
    const { deps, protectSpy } = setup(allow)
    const texts = [`IBAN ${IBAN}`]
    const result = await guardTexts({ texts, model: 'embed', workspaceId: 'ws-1' }, deps)
    expect(result.texts).toBe(texts)
    expect(protectSpy).not.toHaveBeenCalled()
  })

  it('leaves the texts sent to a model on this server as they are', async () => {
    const { deps, protectSpy } = setup(refuse, { offInstance: false })
    const texts = [`IBAN ${IBAN}`]
    const result = await guardTexts({ texts, model: 'embed', workspaceId: 'ws-1' }, deps)
    expect(result.texts).toBe(texts)
    expect(protectSpy).not.toHaveBeenCalled()
  })

  it('masks every text bound for a model off the instance, in order', async () => {
    const { deps } = setup(mask)
    const result = await guardTexts(
      { texts: ['propre', `IBAN ${IBAN}`, 'Marie Dupont'], model: 'embed', workspaceId: 'ws-1' },
      deps
    )
    expect(result.texts).toEqual(['propre', 'IBAN [IBAN]', '<PERSON>'])
    expect(result.applied).toMatchObject({ mode: 'mask', masked: 2 })
  })

  it('refuses, sending nothing, when one text among many holds personal data', async () => {
    const { deps } = setup(refuse)
    const texts = [...Array.from({ length: 50 }, () => 'propre'), `IBAN ${IBAN}`]
    await expect(
      guardTexts({ texts, model: 'embed', workspaceId: 'ws-1' }, deps)
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
  })

  it('stops rather than send unprotected when the policy cannot be read', async () => {
    const { deps } = setup(mask)
    deps.loadPolicy = async () => {
      throw new Error('database down')
    }
    await expect(
      guardTexts({ texts: ['x'], model: 'embed', workspaceId: 'ws-1' }, deps)
    ).rejects.toBeInstanceOf(PersonalDataServiceError)
  })
})
